#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QGroupBox>
#include <QRegularExpression>
#include <QSlider>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

// Construction-only references preserve the subsequent Settings/live layout pass.
PixelStudioPanel::OutputParts PixelStudioPanel::createOutputControls(
    QVBoxLayout* shell, QSettings& settings, QHBoxLayout* sizeRow, QHBoxLayout* presetRow) {
    auto* outputGroup = new QGroupBox(text("WLED 输出通道"), this);
    auto* controls = new QGridLayout(outputGroup);
    transport_ = new StudioCombo(outputGroup);
    transport_->addItem(text("IP / DDP（无线）"), QStringLiteral("ddp"));
    transport_->addItem(text("USB / Adalight（有线）"), QStringLiteral("usb"));
    transport_->setCurrentIndex(qMax(0, transport_->findData(settings.value(QStringLiteral("transport"), QStringLiteral("ddp")))));
    host_ = new StudioLineEdit(settings.value(QStringLiteral("host"), QStringLiteral("192.168.1.100")).toString(), outputGroup);
    host_->setPlaceholderText(QStringLiteral("192.168.1.100"));
    serialPort_ = new StudioLineEdit(settings.value(QStringLiteral("serialPort")).toString(), outputGroup);
    serialPort_->setPlaceholderText(text("点击选择"));
    serialScan_ = new StudioButton(text("选择串口"), outputGroup);
    deviceSize_ = new StudioButton(text("读取屏幕尺寸"), outputGroup);
    fps_ = new StudioSpinBox(outputGroup);
    fps_->setRange(1, 60);
    fps_->setSuffix(QStringLiteral(" FPS"));
    fps_->setValue(settings.value(QStringLiteral("fps"), 60).toInt());
    brightness_ = new StudioSpinBox(outputGroup);
    brightness_->setRange(0, 255);
    brightness_->setValue(settings.value(QStringLiteral("brightness"), 255).toInt());
    brightnessSlider_ = new QSlider(Qt::Horizontal, outputGroup);
    brightnessSlider_->setRange(0, 255);
    brightnessSlider_->setValue(brightness_->value());
    brightnessSlider_->setPageStep(16);
    speed_ = new StudioDoubleSpinBox(outputGroup);
    speed_->setRange(0.25, 3.0);
    speed_->setSingleStep(0.05);
    speed_->setDecimals(2);
    speed_->setSuffix(QStringLiteral(" x"));
    speed_->setValue(settings.value(QStringLiteral("speed"), 1.0).toDouble());
    speedSlider_ = new QSlider(Qt::Horizontal, outputGroup);
    speedSlider_->setRange(25, 300);
    speedSlider_->setValue(qRound(speed_->value() * 100));
    speedSlider_->setPageStep(25);
    mapping_ = new StudioCombo(outputGroup);
    mapping_->setProperty("preferred", settings.value(QStringLiteral("mapping")).toString());
    clockFont_ = new StudioCombo(outputGroup);
    clockFont_->addItem(text("圆角像素"), QStringLiteral("rounded"));
    clockFont_->addItem(text("经典像素"), QStringLiteral("classic"));
    clockFont_->addItem(text("七段数码"), QStringLiteral("segment"));
    clockPalette_ = new StudioCombo(outputGroup);
    circuitPalette_ = new StudioCombo(outputGroup);
    circuitPalette_->addItem(text("冰蓝"), QStringLiteral("ice"));
    circuitPalette_->addItem(text("薄荷"), QStringLiteral("mint"));
    circuitPalette_->addItem(text("琥珀"), QStringLiteral("amber"));
    circuitPalette_->addItem(text("樱粉"), QStringLiteral("rose"));
    circuitPalette_->addItem(text("紫晶"), QStringLiteral("violet"));
    circuitPalette_->setCurrentIndex(qMax(0, circuitPalette_->findData(settings.value(QStringLiteral("circuitPalette"), QStringLiteral("ice")))));
    clockPalette_->addItem(text("薄荷"), QStringLiteral("mint"));
    clockPalette_->addItem(text("琥珀"), QStringLiteral("amber"));
    clockPalette_->addItem(text("冰蓝"), QStringLiteral("ice"));
    clockPalette_->addItem(text("自定义"), QStringLiteral("custom"));
    customClockPalette_ = settings.value(QStringLiteral("customClockPalette"), QStringLiteral("custom:#f2ebd6:#8af2c9:#397660")).toString();
    if (!QRegularExpression(QStringLiteral("^custom:(#[0-9a-fA-F]{6}):(#[0-9a-fA-F]{6}):(#[0-9a-fA-F]{6})$")).match(customClockPalette_).hasMatch())
        customClockPalette_ = QStringLiteral("custom:#f2ebd6:#8af2c9:#397660");
    clockFont_->setCurrentIndex(qMax(0, clockFont_->findData(settings.value(QStringLiteral("clockFont"), QStringLiteral("rounded")))));
    clockPalette_->setCurrentIndex(qMax(0, clockPalette_->findData(settings.value(QStringLiteral("clockPalette"), QStringLiteral("mint")))));
    controls->addWidget(new StudioLabel(text("输出方式"), outputGroup), 0, 0);
    controls->addWidget(transport_, 0, 1, 1, 2);
    controls->addWidget(new StudioLabel(text("帧率"), outputGroup), 0, 3);
    controls->addWidget(fps_, 0, 4);
    controls->addWidget(new StudioLabel(text("IP 地址"), outputGroup), 1, 0);
    controls->addWidget(host_, 1, 1);
    controls->addWidget(deviceSize_, 1, 2);
    controls->addWidget(new StudioLabel(text("USB 端口"), outputGroup), 1, 3);
    auto* serialControl = new QWidget(outputGroup);
    auto* serialLayout = new QHBoxLayout(serialControl);
    serialLayout->setContentsMargins(0, 0, 0, 0);
    serialLayout->addWidget(serialPort_, 1);
    serialLayout->addWidget(serialScan_);
    controls->addWidget(serialControl, 1, 4);
    controls->addWidget(new StudioLabel(text("排列"), outputGroup), 2, 0);
    controls->addWidget(mapping_, 2, 1, 1, 2);
    controls->addWidget(new StudioLabel(text("亮度"), outputGroup), 2, 3);
    auto* brightnessControl = new QWidget(outputGroup);
    auto* brightnessLayout = new QHBoxLayout(brightnessControl);
    brightnessLayout->setContentsMargins(0, 0, 0, 0);
    brightnessLayout->addWidget(brightnessSlider_, 1);
    brightnessLayout->addWidget(brightness_);
    controls->addWidget(brightnessControl, 2, 4);
    clockLabel_ = new StudioLabel(text("时钟样式"), outputGroup);
    clockControls_ = new QWidget(outputGroup);
    auto* clockLayout = new QHBoxLayout(clockControls_);
    clockLayout->setContentsMargins(0, 0, 0, 0);
    clockLayout->addWidget(clockFont_, 1);
    clockLayout->addWidget(clockPalette_);
    auto* editColors = new StudioButton(text("自定义配色"), clockControls_);
    customColorsButton_ = editColors;
    clockLayout->addWidget(editColors);
    // Clock, animation and temperature palettes use the same themed dialog.
    connect(editColors, &QPushButton::clicked, this, &PixelStudioPanel::editThermalColors);
    controls->addWidget(clockLabel_, 3, 0);
    controls->addWidget(clockControls_, 3, 1, 1, 2);
    controls->addWidget(new StudioLabel(text("速度"), outputGroup), 3, 3);
    auto* speedControl = new QWidget(outputGroup);
    auto* speedLayout = new QHBoxLayout(speedControl);
    speedLayout->setContentsMargins(0, 0, 0, 0);
    speedLayout->addWidget(speedSlider_, 1);
    speedLayout->addWidget(speed_);
    controls->addWidget(speedControl, 3, 4);
    controls->setColumnStretch(1, 1);
    // A shared toolbar keeps screen setup visible without imposing a minimum
    // text width on the aspect-ratio-controlled preview column.
    auto* screenToolbar = new QHBoxLayout;
    screenToolbar->setSpacing(12);
    screenToolbar->addLayout(sizeRow);
    screenToolbar->addLayout(presetRow);
    screenToolbar->addWidget(cad_);
    screenToolbar->addStretch(1);
    width_->setMaximumWidth(72);
    height_->setMaximumWidth(72);

    // Three aligned label/control pairs per row, rather than a tall form
    // with a largely empty final row. Keep the existing widgets and signals.
    auto* fpsLabel = controls->itemAtPosition(0, 3)->widget();
    auto* mappingLabel = controls->itemAtPosition(2, 0)->widget();
    auto* serialLabel = controls->itemAtPosition(1, 3)->widget();
    auto* brightnessLabel = controls->itemAtPosition(2, 3)->widget();
    auto* speedLabel = controls->itemAtPosition(3, 3)->widget();
    controls->addWidget(transport_, 0, 1);
    controls->addWidget(fpsLabel, 0, 2);
    controls->removeWidget(fps_);
    auto* fpsControl = new QWidget(outputGroup);
    auto* fpsLayout = new QHBoxLayout(fpsControl);
    fpsLayout->setContentsMargins(0, 0, 0, 0);
    auto* fpsSlider = new QSlider(Qt::Horizontal, fpsControl);
    fpsSlider->setRange(fps_->minimum(), fps_->maximum());
    fpsSlider->setValue(fps_->value());
    fpsSlider->setPageStep(5);
    fps_->setFixedWidth(88);
    fpsLayout->addWidget(fpsSlider, 1);
    fpsLayout->addWidget(fps_);
    connect(fpsSlider, &QSlider::valueChanged, fps_, &QSpinBox::setValue);
    connect(fps_, qOverload<int>(&QSpinBox::valueChanged), fpsSlider, &QSlider::setValue);
    controls->addWidget(fpsControl, 0, 3);
    controls->addWidget(mappingLabel, 0, 4);
    controls->addWidget(mapping_, 0, 5);
    auto* addressControl = new QWidget(outputGroup);
    auto* addressLayout = new QHBoxLayout(addressControl);
    addressLayout->setContentsMargins(0, 0, 0, 0);
    addressLayout->addWidget(host_, 1);
    addressLayout->addWidget(deviceSize_);
    controls->addWidget(addressControl, 1, 1);
    controls->addWidget(serialLabel, 1, 2);
    controls->addWidget(serialControl, 1, 3);
    controls->addWidget(brightnessLabel, 1, 4);
    controls->addWidget(brightnessControl, 1, 5);
    controls->addWidget(clockLabel_, 2, 0);
    controls->addWidget(clockControls_, 2, 1, 1, 3);
    controls->addWidget(speedLabel, 2, 4);
    controls->addWidget(speedControl, 2, 5);
    controls->setColumnStretch(1, 1);
    controls->setColumnStretch(3, 1);
    controls->setColumnStretch(5, 1);
    controls->setHorizontalSpacing(10);
    controls->setVerticalSpacing(6);
    shell->addWidget(outputGroup);

    return {outputGroup, controls, serialControl, screenToolbar, fpsControl};
}
