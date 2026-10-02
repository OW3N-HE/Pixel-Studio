#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QJsonArray>
#include <QSlider>
#include <QTimer>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

// Native playback coordinator: device ownership and Qt scheduling stay here.
// Construction calls this at the original point, after all controls exist.
void PixelStudioPanel::initializePlayback() {
    debounce_ = new QTimer(this);
    debounce_->setSingleShot(true);
    debounce_->setInterval(60);
    connect(debounce_, &QTimer::timeout, this, &PixelStudioPanel::updatePreview);
    auto changed = [this] { debounce_->start(); };
    for (auto* spin : { width_, height_, brightness_, fps_ }) {
        connect(spin, qOverload<int>(&QSpinBox::valueChanged), this, changed);
    }
    connect(speed_, qOverload<double>(&QDoubleSpinBox::valueChanged), this, changed);
    connect(gamma_, qOverload<double>(&QDoubleSpinBox::valueChanged), this, changed);
    connect(colorMatching_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this, changed] {
        gamma_->setEnabled(colorMatching_->currentData().toBool());
        changed();
    });
    connect(brightnessSlider_, &QSlider::valueChanged, brightness_, &QSpinBox::setValue);
    connect(brightness_, qOverload<int>(&QSpinBox::valueChanged), brightnessSlider_, &QSlider::setValue);
    connect(speedSlider_, &QSlider::valueChanged, this, [this](int value) { speed_->setValue(value / 100.0); });
    connect(speed_, qOverload<double>(&QDoubleSpinBox::valueChanged), this,
        [this](double value) { speedSlider_->setValue(qRound(value * 100)); });
    for (auto* combo : { transport_, mapping_, clockFont_, clockPalette_, circuitPalette_ }) {
        connect(combo, qOverload<int>(&QComboBox::currentIndexChanged), this, changed);
    }
    connect(host_, &QLineEdit::editingFinished, this, changed);
    connect(serialPort_, &QLineEdit::editingFinished, this, changed);
    connect(serialScan_, &QPushButton::clicked, this, [this] {
        busy_ = true;
        updateControls();
        showStatus(text("正在扫描本机串口，请从列表中选择你的 ESP32。"));
        send(QStringLiteral("ports"));
    });
    connect(transport_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] { updateControls(); });
    connect(circuitPalette_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] {
        const auto* item = gallery_->currentItem();
        if (item) preferences().setValue(QStringLiteral("paletteSelection/") + item->data(Qt::UserRole).toString(),
            circuitPalette_->currentData().toString());
    });
    connect(gallery_, &QListWidget::currentItemChanged, this, [this, changed](QListWidgetItem* current, QListWidgetItem*) {
        // Run after Qt's selection/layout scrolling so the fade-safe position wins.
        QTimer::singleShot(0, gallery_, [this] {
            static_cast<AnimationGallery*>(gallery_)->revealCurrentCard();
        });
        if (current) {
            const QString mode = current->data(Qt::UserRole).toString();
            const QString palette = preferences().value(QStringLiteral("paletteSelection/") + mode,
                QStringLiteral("ice")).toString();
            const int index = circuitPalette_->findData(palette);
            if (index >= 0) {
                const bool blocked = circuitPalette_->blockSignals(true);
                circuitPalette_->setCurrentIndex(index);
                circuitPalette_->blockSignals(blocked);
            }
        }
        updateControls();
        changed();
    });
    connect(cad_, &QCheckBox::toggled, this, [this] { savePreferences(); });
    connect(autoStart_, &QCheckBox::toggled, this, [this] { savePreferences(); });
    connect(language_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] {
        retranslateUi();
        savePreferences();
    });
    connect(start_, &QPushButton::clicked, this, [this] {
        if (!ready_ || busy_) return;
        if (width_->value() * height_->value() > 4096) {
            showStatus(text("像素总数不能超过 4096。"), true);
            return;
        }
        debounce_->stop();
        updatePreview();
        savePreferences();
        busy_ = true;
        updateControls();
        showStatus(transport_->currentData().toString() == QStringLiteral("usb")
            ? text("正在打开 USB 有线通道；首次连接约需 3 秒。")
            : text("正在准备 DDP 播放；不会抢占网页版正在发送的同一块屏幕。"));
        send(QStringLiteral("start"), configuration());
    });
    connect(stop_, &QPushButton::clicked, this, [this] {
        playbackIntent_ = false;
        resumeOnReady_ = false;
        savePreferences();
        busy_ = true;
        updateControls();
        showStatus(text("正在停止本插件的播放会话。"));
        send(QStringLiteral("stop"));
    });
    connect(deviceSize_, &QPushButton::clicked, this, [this] {
        busy_ = true;
        updateControls();
        showStatus(text("正在读取 WLED 矩阵尺寸，不修改设备配置。"));
        send(QStringLiteral("device"), QJsonObject{{QStringLiteral("host"), host_->text().trimmed()}});
    });

}

QJsonObject PixelStudioPanel::configuration() const {
    const auto* selected = gallery_->currentItem();
    const QString mode = selected ? selected->data(Qt::UserRole).toString() : QString();
    const bool animationPalette = mode == QStringLiteral("pocket_circuit")
        || mode == QStringLiteral("wave") || mode == QStringLiteral("portrait_portal")
        || mode == QStringLiteral("pocket_starwhale") || mode == QStringLiteral("ripples")
        || mode == QStringLiteral("waterfall") || mode.startsWith(QStringLiteral("scene_"));
    const QString palette = animationPalette ? circuitPalette_->currentData().toString()
        : clockPalette_->currentData().toString();
    return QJsonObject{
        {QStringLiteral("mode"), selected ? selected->data(Qt::UserRole).toString() : QString()},
        {QStringLiteral("thermal"), thermalConfiguration()},
        {QStringLiteral("w"), width_->value()}, {QStringLiteral("h"), height_->value()},
        {QStringLiteral("brightness"), brightness_->value()}, {QStringLiteral("fps"), fps_->value()},
        {QStringLiteral("speed"), speed_->value()}, {QStringLiteral("mapping"), mapping_->currentData().toString()},
        {QStringLiteral("clockFont"), clockFont_->currentData().toString()},
        {QStringLiteral("clockPalette"), palette == QStringLiteral("custom")
            ? preferences().value(QStringLiteral("customPalette/") + mode,
                mode == QStringLiteral("clock") ? customClockPalette_
                    : QStringLiteral("custom:#e5f5ff:#6ad3f5:#356e88")).toString()
            : palette},
        {QStringLiteral("transport"), transport_->currentData().toString()},
        {QStringLiteral("serialPort"), serialPort_->text().trimmed()},
        {QStringLiteral("host"), host_->text().trimmed()},
        {QStringLiteral("match"), colorMatching_->currentData().toBool()},
        {QStringLiteral("gamma"), gamma_->value()}
    };
}
void PixelStudioPanel::updatePreview() {
    setLabelText(dimensions_, text("实时画面 · %1 x %2  |  %3 PX"),
        {QString::number(width_->value()), QString::number(height_->value()), QString::number(width_->value() * height_->value())});
    if (!ready_ || !gallery_->currentItem()) return;
    if (width_->value() * height_->value() > 4096) {
        showStatus(text("像素总数不能超过 4096。"), true);
        return;
    }
    // Coalesce changes while an output operation is pending. Applying only
    // preview configuration here would leave the output on the old selection.
    if (streaming_ && busy_) {
        debounce_->start();
        return;
    }
    previewSequence_ = sequence_ + 1;
    if (streaming_ && !busy_) {
        busy_ = true;
        updateControls();
        showStatus(text("正在无缝更新当前播放，不中断输出。"));
        send(QStringLiteral("start"), configuration());
    } else {
        send(QStringLiteral("configure"), configuration());
    }
    savePreferences();
}
void PixelStudioPanel::updateControls() {
    if (clockColorControls_) {
        const auto* item = gallery_->currentItem();
        const QString mode = item ? item->data(Qt::UserRole).toString() : QString();
        const bool clockSelected = mode == QStringLiteral("clock");
        const bool circuitSelected = mode == QStringLiteral("pocket_circuit");
        const bool paletteSelected = circuitSelected || mode == QStringLiteral("wave")
            || mode == QStringLiteral("portrait_portal") || mode == QStringLiteral("pocket_starwhale")
            || mode == QStringLiteral("ripples") || mode == QStringLiteral("waterfall") || mode.startsWith(QStringLiteral("scene_"));
        arrangeLiveControls(clockSelected, paletteSelected);
        clockColorLabel_->setVisible(clockSelected || paletteSelected);
        clockColorControls_->setVisible(clockSelected || paletteSelected);
        clockPalette_->setVisible(clockSelected);
        customColorsButton_->setVisible(clockSelected);
        animationColorsButton_->setVisible(paletteSelected);
        circuitPalette_->setVisible(paletteSelected);
    }
    if (randomTimer_ && randomPlayback_) {
        randomDuration_->setEnabled(randomPlayback_->isChecked());
        if (streaming_ && randomPlayback_->isChecked() && !closing_) {
            if (!randomTimer_->isActive()) randomTimer_->start();
        } else {
            randomTimer_->stop();
        }
    }
    load_->setEnabled(!busy_ && !streaming_);
    projectPath_->setEnabled(!busy_ && !streaming_);
    nodePath_->setEnabled(!busy_ && !streaming_);
    start_->setEnabled(ready_ && !busy_ && gallery_->currentItem());
    stop_->setEnabled(ready_ && (busy_ || streaming_));
    // Mutually exclusive controls occupy the same position in the action row.
    const bool showStop = streaming_ || busy_;
    start_->setVisible(!showStop);
    stop_->setVisible(showStop);
    outputBoard_->setPlaying(streaming_);
    deviceSize_->setEnabled(ready_ && !busy_ && !streaming_);
    const bool usb = transport_->currentData().toString() == QStringLiteral("usb");
    transport_->setEnabled(!busy_ && !streaming_);
    host_->setEnabled(!usb && !busy_ && !streaming_);
    serialPort_->setEnabled(usb && !busy_ && !streaming_);
    serialScan_->setEnabled(usb && !busy_ && !streaming_);
    deviceSize_->setEnabled(!usb && ready_ && !busy_ && !streaming_);
    const bool clockSelected = gallery_->currentItem()
        && gallery_->currentItem()->data(Qt::UserRole).toString() == QStringLiteral("clock");
    clockLabel_->setVisible(clockSelected);
    clockControls_->setVisible(clockSelected);
    updateThermalControls();
}
void PixelStudioPanel::showStatus(const QString& message, bool error, const QStringList& arguments) {
    setLabelText(status_, message, arguments);
    status_->setToolTip(status_->text());
    status_->setVisible(error);
    start_->setToolTip(status_->text());
    stop_->setToolTip(status_->text());
    status_->setStyleSheet(error ? QStringLiteral("color:#e48b65;") : QString());
}
void PixelStudioPanel::advanceRandomAnimation() {
    if (!randomPlayback_->isChecked() || !streaming_ || !ready_ || busy_ || closing_) return;
    QJsonArray candidates;
    for (int i = 0; i < gallery_->count(); ++i) {
        const auto* item = gallery_->item(i);
        if (!item->isHidden()) candidates.append(item->data(Qt::UserRole).toString());
    }
    const auto* current = gallery_->currentItem();
    if (!current || candidates.size() < 2) return;
    send(QStringLiteral("shuffle"), QJsonObject{
        {QStringLiteral("candidates"), candidates},
        {QStringLiteral("current"), current->data(Qt::UserRole).toString()},
        {QStringLiteral("revision"), previewSequence_}});
}
