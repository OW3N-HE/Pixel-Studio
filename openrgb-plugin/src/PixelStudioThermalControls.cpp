#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include <QJsonDocument>
#include <QSignalBlocker>
#include <QSlider>
#include <QTimer>

QJsonObject PixelStudioPanel::thermalConfiguration() const {
    QJsonObject result = thermalPreferences_;
    if (!thermalSampling_) return result;
    result.insert(QStringLiteral("sampleSeconds"), thermalSampling_->value());
    if (thermalFont_->currentData().toString() != QStringLiteral("fixed"))
        result.insert(QStringLiteral("font"), thermalFont_->currentData().toString());
    result.insert(QStringLiteral("cpuBrand"), thermalCpu_->currentData().toString());
    result.insert(QStringLiteral("gpuBrand"), thermalGpu_->currentData().toString());
    return result;
}

void PixelStudioPanel::updateThermalControls() {
    if (!liveLayout_) return;
    if (!thermalSampling_) {
        auto settings = preferences();
        thermalLegacyPreferences_ = QJsonDocument::fromJson(settings.value(QStringLiteral("thermal")).toByteArray()).object();
        thermalPreferencesByMode_ = QJsonDocument::fromJson(settings.value(QStringLiteral("thermalByMode")).toByteArray()).object();
        thermalPreferences_ = thermalLegacyPreferences_;
        auto* parent = liveLayout_->parentWidget();
        thermalSamplingLabel_ = new StudioLabel(text("采样"), parent);
        thermalSamplingControls_ = new QWidget(parent);
        auto* sampleRow = new QHBoxLayout(thermalSamplingControls_);
        sampleRow->setContentsMargins(0, 0, 0, 0);
        sampleRow->setSpacing(8);
        auto* slider = new QSlider(Qt::Horizontal, thermalSamplingControls_);
        thermalSamplingSlider_ = slider;
        slider->setRange(1, 6);
        thermalSampling_ = new StudioDoubleSpinBox(thermalSamplingControls_);
        thermalSampling_->setRange(0.5, 3.0);
        thermalSampling_->setSingleStep(0.5);
        thermalSampling_->setDecimals(1);
        thermalSampling_->setFixedSize(68, 30);
        thermalSampling_->setAlignment(Qt::AlignCenter);
        thermalSampling_->setValue(qBound(0.5, qRound(thermalPreferences_.value(QStringLiteral("sampleSeconds")).toDouble(1.0) * 2) / 2.0, 3.0));
        slider->setValue(qRound(thermalSampling_->value() * 2));
        sampleRow->addWidget(slider, 1);
        sampleRow->addWidget(thermalSampling_);
        thermalSamplingUnit_ = new StudioLabel(thermalSamplingControls_);
        sampleRow->addWidget(thermalSamplingUnit_);
        thermalFont_ = new StudioCombo(parent);
        thermalFont_->addItem(text("七段数码"), QStringLiteral("segment"));
        thermalFont_->addItem(text("经典像素"), QStringLiteral("classic"));
        thermalFont_->addItem(text("圆角像素"), QStringLiteral("rounded"));
        thermalFont_->addItem(text("固定点阵"), QStringLiteral("fixed"));
        thermalFont_->setCurrentIndex(qMax(0, thermalFont_->findData(thermalPreferences_.value(QStringLiteral("font")).toString(QStringLiteral("segment")))));
        thermalColorControls_ = new QWidget(parent);
        auto* colors = new QHBoxLayout(thermalColorControls_);
        colors->setContentsMargins(0, 0, 0, 0);
        colors->setSpacing(8);
        thermalCpu_ = new StudioCombo(thermalColorControls_);
        thermalGpu_ = new StudioCombo(thermalColorControls_);
        thermalCpu_->addItem(QStringLiteral("CPU AMD"), QStringLiteral("amd"));
        thermalCpu_->addItem(QStringLiteral("CPU Intel"), QStringLiteral("intel"));
        thermalGpu_->addItem(QStringLiteral("GPU NVIDIA"), QStringLiteral("nvidia"));
        thermalGpu_->addItem(QStringLiteral("GPU AMD"), QStringLiteral("amd"));
        thermalGpu_->addItem(QStringLiteral("GPU Intel"), QStringLiteral("intel"));
        thermalCpu_->setCurrentIndex(qMax(0, thermalCpu_->findData(thermalPreferences_.value(QStringLiteral("cpuBrand")).toString(QStringLiteral("amd")))));
        thermalGpu_->setCurrentIndex(qMax(0, thermalGpu_->findData(thermalPreferences_.value(QStringLiteral("gpuBrand")).toString(QStringLiteral("nvidia")))));
        thermalCustom_ = new StudioButton(text("自定义"), thermalColorControls_);
        for (QWidget* widget : {static_cast<QWidget*>(thermalCpu_), static_cast<QWidget*>(thermalGpu_), static_cast<QWidget*>(thermalCustom_)}) {
            widget->setMinimumWidth(0);
            widget->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
            widget->setFixedHeight(30);
            colors->addWidget(widget, 1, Qt::AlignVCenter);
        }
        // Reuse clock selector metrics; a local zero-padding rule shrinks the native frame.
        for (auto* combo : {thermalFont_, thermalCpu_, thermalGpu_}) {
            combo->setStyleSheet(clockFont_->styleSheet());
            combo->setFixedHeight(clockFont_->minimumHeight());
        }
        for (QWidget* widget : {static_cast<QWidget*>(thermalSamplingLabel_), thermalSamplingControls_, static_cast<QWidget*>(thermalFont_), thermalColorControls_})
            widget->setFixedHeight(30);
        const auto changed = [this] { thermalPreferences_ = thermalConfiguration(); savePreferences(); if (debounce_) debounce_->start(); };
        connect(slider, &QSlider::valueChanged, this, [this](int value) { thermalSampling_->setValue(value / 2.0); });
        connect(thermalSampling_, qOverload<double>(&QDoubleSpinBox::valueChanged), this, [this, slider, changed](double value) {
            const double rounded = qBound(0.5, qRound(value * 2) / 2.0, 3.0);
            const QSignalBlocker spinBlock(thermalSampling_), sliderBlock(slider);
            thermalSampling_->setValue(rounded);
            slider->setValue(qRound(rounded * 2));
            changed();
        });
        for (auto* combo : {thermalFont_, thermalCpu_, thermalGpu_})
            connect(combo, qOverload<int>(&QComboBox::currentIndexChanged), this, changed);
        connect(thermalCustom_, &QPushButton::clicked, this, &PixelStudioPanel::editThermalColors);
    }
    const auto* item = gallery_->currentItem();
    const QString mode = item ? item->data(Qt::UserRole).toString() : QString();
    const bool thermal = mode == QStringLiteral("thermal_icons") || mode == QStringLiteral("thermal_digits")
        || mode == QStringLiteral("thermal_labels") || mode == QStringLiteral("thermal_gauges");
    if (mode != thermalMode_) {
        if (!thermalMode_.isEmpty()) thermalPreferencesByMode_.insert(thermalMode_, thermalConfiguration());
        thermalMode_ = thermal ? mode : QString();
        if (thermal) {
            thermalPreferences_ = thermalPreferencesByMode_.value(mode).isObject()
                ? thermalPreferencesByMode_.value(mode).toObject() : thermalLegacyPreferences_;
            const QSignalBlocker samplingBlock(thermalSampling_), sliderBlock(thermalSamplingSlider_);
            const QSignalBlocker cpuBlock(thermalCpu_), gpuBlock(thermalGpu_);
            const double interval = qBound(0.5, qRound(thermalPreferences_.value(QStringLiteral("sampleSeconds")).toDouble(1.0) * 2) / 2.0, 3.0);
            thermalSampling_->setValue(interval);
            thermalSamplingSlider_->setValue(qRound(interval * 2));
            thermalCpu_->setCurrentIndex(qMax(0, thermalCpu_->findData(thermalPreferences_.value(QStringLiteral("cpuBrand")).toString(QStringLiteral("amd")))));
            thermalGpu_->setCurrentIndex(qMax(0, thermalGpu_->findData(thermalPreferences_.value(QStringLiteral("gpuBrand")).toString(QStringLiteral("nvidia")))));
        }
    }
    for (QWidget* widget : {static_cast<QWidget*>(thermalSamplingLabel_), thermalSamplingControls_, static_cast<QWidget*>(thermalFont_), thermalColorControls_})
        widget->setVisible(thermal);
    speedLabel_->setVisible(!thermal);
    speedControls_->setVisible(!thermal);
    thermalSamplingUnit_->setText(english_ ? QStringLiteral("s") : text("秒"));
    if (!thermal) return;
    const bool large = mode == QStringLiteral("thermal_digits");
    {
        const QSignalBlocker blocker(thermalFont_);
        thermalFont_->clear();
        if (large) {
            for (int i = 0; i < clockFont_->count(); ++i) {
                thermalFont_->addItem(clockFont_->itemText(i), clockFont_->itemData(i));
                const auto source = clockFont_->itemData(i, Qt::UserRole + 10);
                thermalFont_->setItemData(i, source.isValid() ? source : QVariant(clockFont_->itemText(i)), Qt::UserRole + 10);
            }
            thermalFont_->setCurrentIndex(qMax(0, thermalFont_->findData(thermalPreferences_.value(QStringLiteral("font")).toString(QStringLiteral("segment")))));
        } else {
            thermalFont_->addItem(localized(text("固定点阵")), QStringLiteral("fixed"));
            thermalFont_->setItemData(0, text("固定点阵"), Qt::UserRole + 10);
        }
        thermalFont_->setEnabled(large);
    }
    thermalCpu_->setEnabled(!thermalPreferences_.value(QStringLiteral("custom")).toBool());
    thermalGpu_->setEnabled(!thermalPreferences_.value(QStringLiteral("custom")).toBool());
    while (auto* cell = liveLayout_->takeAt(0)) delete cell;
    liveLayout_->setProperty("layoutMode", 3);
    clockControls_->hide();
    clockColorControls_->hide();
    animationColorsButton_->hide();
    clockLabel_->show();
    clockColorLabel_->show();
    liveLayout_->addWidget(brightnessLabel_, 0, 0, Qt::AlignVCenter);
    liveLayout_->addWidget(brightnessControls_, 0, 1, Qt::AlignVCenter);
    liveLayout_->addWidget(thermalSamplingLabel_, 0, 2, Qt::AlignVCenter);
    liveLayout_->addWidget(thermalSamplingControls_, 0, 3, Qt::AlignVCenter);
    liveLayout_->addWidget(clockLabel_, 1, 0, Qt::AlignVCenter);
    liveLayout_->addWidget(thermalFont_, 1, 1, Qt::AlignVCenter);
    liveLayout_->addWidget(clockColorLabel_, 1, 2, Qt::AlignVCenter);
    liveLayout_->addWidget(thermalColorControls_, 1, 3, Qt::AlignVCenter);
    clockFont_->ensurePolished();
    customColorsButton_->ensurePolished();
    const int controlHeight = qMax(30, qMax(clockFont_->sizeHint().height(), customColorsButton_->sizeHint().height()));
    for (QWidget* widget : {brightnessLabel_, brightnessControls_, static_cast<QWidget*>(thermalSamplingLabel_),
                           thermalSamplingControls_, static_cast<QWidget*>(clockLabel_), static_cast<QWidget*>(thermalFont_),
                           static_cast<QWidget*>(clockColorLabel_), thermalColorControls_, static_cast<QWidget*>(thermalCpu_),
                           static_cast<QWidget*>(thermalGpu_), static_cast<QWidget*>(thermalCustom_)}) {
        widget->setFixedHeight(controlHeight);
    }
    thermalFont_->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
    thermalColorControls_->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
    const int unitWidth = qMax(thermalSamplingUnit_->fontMetrics().horizontalAdvance(QStringLiteral("s")),
                              thermalSamplingUnit_->fontMetrics().horizontalAdvance(text("秒")));
    thermalSamplingUnit_->setFixedWidth(unitWidth);
    thermalSampling_->setFixedSize(qMax(44, speed_->width() - unitWidth - 8), speed_->height());
    thermalSampling_->setAlignment(Qt::AlignCenter);
    liveLayout_->setContentsMargins(6, 0, 6, 0);
    liveLayout_->setVerticalSpacing(12);
    liveLayout_->setAlignment(Qt::AlignTop);
    liveLayout_->setRowMinimumHeight(0, controlHeight);
    liveLayout_->setRowMinimumHeight(1, controlHeight);
    liveLayout_->setRowStretch(0, 0);
    liveLayout_->setRowStretch(1, 0);
    liveLayout_->setColumnStretch(1, 1);
    liveLayout_->setColumnStretch(3, 1);
    liveLayout_->parentWidget()->setFixedHeight(12 + controlHeight * 2);
    const int labelWidth = qMax(qMax(brightnessLabel_->sizeHint().width(), speedLabel_->sizeHint().width()),
        qMax(clockLabel_->fontMetrics().horizontalAdvance(clockLabel_->text()),
             clockColorLabel_->fontMetrics().horizontalAdvance(clockColorLabel_->text()))) + 8;
    liveLayout_->setColumnMinimumWidth(0, labelWidth);
    liveLayout_->setColumnMinimumWidth(2, labelWidth);
}

