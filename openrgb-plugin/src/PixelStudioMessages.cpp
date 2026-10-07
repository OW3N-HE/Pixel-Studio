#include <QStyleOptionFrame>
#include <QMessageBox>
#include <QRandomGenerator>
#include "PixelStudioPanel.h"
#include "PixelStudioUpdates.h"
#include "PixelStudioTranslations.h"
#include "PixelStudioLogo.h"
#include <QColorDialog>
#include <QDialogButtonBox>
#include <QRegularExpression>
#include <QSettings>
#include <QPalette>
#include <QTextLayout>

#include <QAbstractButton>
#include <QAbstractSpinBox>
#include <QApplication>
#include <QLocale>
#include <QScrollArea>
#include <QScrollBar>
#include <QScreen>
#include <QStyledItemDelegate>
#include <QStylePainter>
#include <QStyleOptionButton>
#include <QStyleOptionComboBox>
#include <QTabWidget>
#include <QCheckBox>
#include <QComboBox>
#include <QDesktopServices>
#include <QDialog>
#include <QDir>
#include <QDoubleSpinBox>
#include <QEvent>
#include <QFileDialog>
#include <QFileInfo>
#include <QFont>
#include <QFormLayout>
#include <QGridLayout>
#include <QGroupBox>
#include <QHBoxLayout>
#include <QIcon>
#include <QImage>
#include <QInputDialog>
#include <QJsonArray>
#include <QJsonDocument>
#include <QLabel>
#include <QLineEdit>
#include <QKeyEvent>
#include <QMouseEvent>
#include <QListWidget>
#include <QPainter>
#include <QPainterPath>
#include <QPaintEvent>
#include <QShowEvent>
#include <QHideEvent>
#include <QtMath>
#include <QPixmap>
#include <QPolygonF>
#include <QProcess>
#include <QPushButton>
#include <QSlider>
#include <QSignalBlocker>
#include <QSizePolicy>
#include <QSpinBox>
#include <QStandardPaths>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>

#include "PixelStudioSupport.h"
using namespace PixelStudioSupport;

void PixelStudioPanel::send(const QString& operation, const QJsonObject& payload) {
    if (!helper_ || helper_->state() != QProcess::Running) return;
    if (helper_->bytesToWrite() > 65536) {
        showStatus(text("本地动画进程暂时繁忙，请等待后重试。"), true);
        return;
    }
    const QJsonObject message{{QStringLiteral("id"), ++sequence_},
                              {QStringLiteral("op"), operation},
                              {QStringLiteral("data"), payload}};
    helper_->write(QJsonDocument(message).toJson(QJsonDocument::Compact) + '\n');
}
void PixelStudioPanel::consumeOutput() {
    input_ += helper_->readAllStandardOutput();
    if (input_.size() > 2 * 1024 * 1024) {
        input_.clear();
        showStatus(text("本地动画输出超过缓冲区限制。"), true);
        return;
    }
    int end = -1;
    while ((end = input_.indexOf('\n')) >= 0) {
        const auto line = input_.left(end);
        input_.remove(0, end + 1);
        const auto document = QJsonDocument::fromJson(line);
        if (document.isObject() && !closing_) handleMessage(document.object());
    }
}

void PixelStudioPanel::handleMessage(const QJsonObject& message) {
    const auto type = message.value(QStringLiteral("type")).toString();
    if (type == QStringLiteral("ready")) {
        const QSignalBlocker galleryBlock(gallery_);
        const QSignalBlocker mappingBlock(mapping_);
        gallery_->clear();
        cards_.clear();
        for (const auto value : message.value(QStringLiteral("modes")).toArray()) {
            const auto mode = value.toObject();
            const auto id = mode.value(QStringLiteral("id")).toString();
            static const QHash<QString, QString> thermalTitles{
                {QStringLiteral("thermal_icons"), text("图标温度")},
                {QStringLiteral("thermal_digits"), text("大数字温度")},
                {QStringLiteral("thermal_labels"), text("标签温度")},
                {QStringLiteral("thermal_gauges"), text("温度条")}
            };
            auto* item = new QListWidgetItem(thermalTitles.value(id, mode.value(QStringLiteral("title")).toString()), gallery_);
            item->setData(Qt::UserRole, id);
            item->setData(Qt::UserRole + 10, item->text());
            item->setData(Qt::UserRole + 1, mode.value(QStringLiteral("category")).toString(categoryForMode(id)));
            item->setData(Qt::UserRole + 2, favoriteModes_.contains(id));
            item->setTextAlignment(Qt::AlignHCenter);
            item->setToolTip(item->text() + QStringLiteral("\n") + id);
            cards_.insert(id, item);
        }
        mapping_->clear();
        for (const auto value : message.value(QStringLiteral("mappings")).toArray()) {
            const auto option = value.toObject();
            mapping_->addItem(option.value(QStringLiteral("title")).toString(), option.value(QStringLiteral("value")).toString());
        }
        const auto defaultMap = message.value(QStringLiteral("config")).toObject().value(QStringLiteral("mapping")).toString();
        auto preferredMap = mapping_->property("preferred").toString();
        if (preferredMap.isEmpty()) preferredMap = defaultMap;
        int mapIndex = mapping_->findData(preferredMap);
        if (mapIndex < 0) mapIndex = mapping_->findData(defaultMap);
        mapping_->setCurrentIndex(qMax(0, mapIndex));
        auto* selected = cards_.value(savedMode_, nullptr);
        if (!selected && gallery_->count()) selected = gallery_->item(0);
        gallery_->setCurrentItem(selected);
        retranslateUi();
        ready_ = true;
        syncPresentation(outputBoard_->isVisible() && outputBoard_->window()->isVisible()
            && !outputBoard_->window()->isMinimized());
        updateControls();
        updatePreview();
        const bool resume = resumeOnReady_;
        resumeOnReady_ = false;
        if (autoStart_->isChecked() && resume) {
            busy_ = true;
            updateControls();
            showStatus(text("已加载动画库，正在按保存的设置自动开始播放。"));
            send(QStringLiteral("start"), configuration());
        } else {
            showStatus(text("已加载 %1 种共享动画。点击开始才会向 WLED 发送。"), false, {QString::number(gallery_->count())});
        }
    } else if (type == QStringLiteral("selection")) {
        // A delayed shuffle reply must not override a manual selection or a stop.
        auto* current = gallery_->currentItem();
        auto* next = cards_.value(message.value(QStringLiteral("mode")).toString(), nullptr);
        if (randomPlayback_->isChecked() && streaming_ && ready_ && !busy_ && !closing_
            && current && next && !next->isHidden() && next != current
            && current->data(Qt::UserRole).toString() == message.value(QStringLiteral("current")).toString()
            && message.value(QStringLiteral("revision")).toInt() == previewSequence_)
            gallery_->setCurrentItem(next);
    } else if (type == QStringLiteral("frame")) {
        // Discard an in-flight preview without decoding it after hiding the UI.
        if (!presentationVisible_) return;
        const int w = message.value(QStringLiteral("w")).toInt();
        const int h = message.value(QStringLiteral("h")).toInt();
        if (w == width_->value() && h == height_->value()
            && message.value(QStringLiteral("revision")).toInt() >= previewSequence_) {
            outputBoard_->setFrame(w, h, QByteArray::fromBase64(message.value(QStringLiteral("rgb")).toString().toLatin1()));
        }
    } else if (type == QStringLiteral("thumbnail")) {
        auto* item = cards_.value(message.value(QStringLiteral("mode")).toString(), nullptr);
        if (!item) return;
        const auto rgb = QByteArray::fromBase64(message.value(QStringLiteral("rgb")).toString().toLatin1());
        const auto image = rgbImage(message.value(QStringLiteral("w")).toInt(), message.value(QStringLiteral("h")).toInt(), rgb);
        if (!image.isNull()) item->setIcon(QIcon(QPixmap::fromImage(image).scaled(45, 81, Qt::KeepAspectRatio, Qt::FastTransformation)));
    } else if (type == QStringLiteral("state")) {
        streaming_ = message.value(QStringLiteral("streaming")).toBool();
        // Startup's idle state and shutdown's stop must not erase saved intent.
        if (!closing_ && !resumeOnReady_) {
            playbackIntent_ = streaming_;
            savePreferences();
        }
        if (!streaming_) {
            setLabelText(stats_, text("当前未发送"));
        }
        updateControls();
    } else if (type == QStringLiteral("stats")) {
        const auto stats = message.value(QStringLiteral("stats")).isObject()
            ? message.value(QStringLiteral("stats")).toObject() : message;
        setLabelText(stats_, text("发送 %1 / %2 FPS  |  %3 kbps"),
            {QString::number(stats.value(QStringLiteral("fps")).toDouble(), 'f', 1),
             QString::number(stats.value(QStringLiteral("targetFps")).toInt(fps_->value())),
             QString::number(stats.value(QStringLiteral("kbps")).toDouble() * 1024.0 * 8.0 / 1000.0, 'f', 1)});
    } else if (type == QStringLiteral("device")) {
        width_->setValue(message.value(QStringLiteral("w")).toInt(15));
        height_->setValue(message.value(QStringLiteral("h")).toInt(27));
        showStatus(text("已读取实际矩阵尺寸。只是更新面板输入，没有修改 WLED 配置。"));
    } else if (type == QStringLiteral("ports")) {
        const auto ports = message.value(QStringLiteral("ports")).toArray();
        QStringList labels;
        QStringList ids;
        for (const auto& value : ports) {
            const auto port = value.toObject();
            const QString id = port.value(QStringLiteral("id")).toString();
            const QString name = port.value(QStringLiteral("name")).toString();
            if (!id.isEmpty()) { ids.append(id); labels.append(id + QStringLiteral("  ·  ") + name); }
        }
        if (labels.isEmpty()) {
            showStatus(text("未发现串口。请连接 ESP32 后重新扫描。"), true);
        } else {
            bool accepted = false;
            const QString selected = QInputDialog::getItem(this, localized(text("选择 USB 串口")),
                localized(text("请选择当前连接的 ESP32：")), labels, 0, false, &accepted);
            if (accepted) {
                const int index = labels.indexOf(selected);
                if (index >= 0) serialPort_->setText(ids.at(index));
                showStatus(text("已选择 %1；端口只保存在本机。"), false, {serialPort_->text()});
            }
        }
    } else if (type == QStringLiteral("result")) {
        const auto operation = message.value(QStringLiteral("op")).toString();
        if (operation == QStringLiteral("start") || operation == QStringLiteral("stop") || operation == QStringLiteral("device") || operation == QStringLiteral("ports")) {
            busy_ = false;
            updateControls();
        }
        if (operation == QStringLiteral("start") && streaming_)
            showStatus(transport_->currentData().toString() == QStringLiteral("usb")
                ? text("USB 有线后台正在播放。手绘姿态与光效会持续更新。")
                : text("DDP 后台正在播放。切换动画、速度、配色或亮度会无缝应用。"));
        if (operation == QStringLiteral("stop"))
            showStatus(text("本插件的播放已停止。独立网页版和共享服务保留运行。"));
    } else if (type == QStringLiteral("colorProfile")) {
        const QSignalBlocker blocker(gamma_);
        if (message.value(QStringLiteral("automatic")).toBool())
            gamma_->setValue(message.value(QStringLiteral("gamma")).toDouble(1.0));
        gamma_->setEnabled(false);
    } else if (type == QStringLiteral("error") || type == QStringLiteral("fatal") || type == QStringLiteral("warning")) {
        const auto operation = message.value(QStringLiteral("op")).toString();
        if (operation == QStringLiteral("start") || operation == QStringLiteral("stop")
            || operation == QStringLiteral("device") || operation == QStringLiteral("ports") || type == QStringLiteral("fatal")) busy_ = false;
        if (type == QStringLiteral("fatal")) ready_ = false;
        const QString detail = message.value(QStringLiteral("message")).toString();
        // OS exception text follows the Windows language, not the panel language.
        // Classify serial-open failures before passing them to the UI translator.
        if (detail.contains(QStringLiteral("could not open port"), Qt::CaseInsensitive)) {
            const QString port = serialPort_->text().trimmed();
            if (detail.contains(QStringLiteral("FileNotFoundError")) || detail.contains(QStringLiteral("[Errno 2]"))) {
                showStatus(text("串口 %1 不存在。请连接设备并重新选择串口。"), true, {port});
            } else if (detail.contains(QStringLiteral("PermissionError")) || detail.contains(QStringLiteral("[Errno 13]"))) {
                showStatus(text("无法访问串口 %1。它可能正被其他程序占用，或访问权限不足。"), true, {port});
            } else {
                showStatus(text("无法打开串口 %1。请检查设备连接和串口设置。"), true, {port});
            }
        } else {
            showStatus(detail, true);
        }
        updateControls();
    }
}

