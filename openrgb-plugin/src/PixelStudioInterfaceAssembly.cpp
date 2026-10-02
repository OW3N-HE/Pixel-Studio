#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QGroupBox>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include <QDialog>
#include <QSlider>

void PixelStudioPanel::arrangeSettingsAndLiveControls(QSettings& settings,
    const OutputParts& output, const PreviewParts& preview, const HeaderParts& header,
    const SettingsPageParts& page, QGroupBox* setup) {
    const auto [outputGroup, controls, serialControl, screenToolbar, fpsControl] = output;
    auto* sizeRow = preview.dimensions;
    auto* presetRow = preview.presets;
    auto* web = header.web;
    const auto [libraryDialog, interfaceLayout, screenSettings, screenSettingsLayout] = page;
    // Keep output routing in the settings dialog; leave live adjustments in the panel.
    outputGroup->setTitle(QString());
    outputGroup->setProperty("pixelStudioSource_title", QString());
    screenSettings->setTitle(text("WLED 输出设置"));
    screenSettings->setProperty("pixelStudioSource_title", text("WLED 输出设置"));
    const QVariant selectedTransport = transport_->currentData();
    QVariant usbTransport, ddpTransport;
    for (int i = 0; i < transport_->count(); ++i) {
        if (transport_->itemText(i).contains(QStringLiteral("USB"), Qt::CaseInsensitive))
            usbTransport = transport_->itemData(i);
        else
            ddpTransport = transport_->itemData(i);
    }
    transport_->clear();
    transport_->addItem(QStringLiteral("USB/Adalight"), usbTransport);
    transport_->addItem(QStringLiteral("DDP"), ddpTransport);
    transport_->setCurrentIndex(qMax(0, transport_->findData(selectedTransport)));
    auto* connectionLayout = new QGridLayout;
    connectionLayout->setHorizontalSpacing(24);
    connectionLayout->setVerticalSpacing(10);
    connectionLayout->setColumnStretch(1, 1);
    auto addOutputSetting = [connectionLayout, screenSettings](int row, const QString& title, QWidget* control) {
        auto* label = new StudioLabel(title, screenSettings);
        label->setBuddy(control);
        connectionLayout->addWidget(label, row, 0, Qt::AlignVCenter);
        connectionLayout->addWidget(control, row, 1, Qt::AlignVCenter);
    };
    addOutputSetting(0, text("输出方式"), transport_);
    addOutputSetting(1, text("USB 端口"), serialControl);
    auto* settingsAddress = new QWidget(screenSettings);
    auto* settingsAddressLayout = new QHBoxLayout(settingsAddress);
    settingsAddressLayout->setContentsMargins(0, 0, 0, 0);
    settingsAddressLayout->addWidget(host_, 1);
    settingsAddressLayout->addWidget(deviceSize_);
    addOutputSetting(2, text("IP 地址"), settingsAddress);
    screenSettingsLayout->removeItem(screenToolbar);
    screenSettingsLayout->addLayout(connectionLayout);
    screenSettingsLayout->addLayout(screenToolbar);
    auto* displayLayout = new QGridLayout;
    displayLayout->setHorizontalSpacing(24);
    displayLayout->setVerticalSpacing(10);
    displayLayout->setColumnStretch(1, 1);
    displayLayout->addWidget(new StudioLabel(text("排列"), screenSettings), 0, 0, Qt::AlignVCenter);
    displayLayout->addWidget(mapping_, 0, 1, Qt::AlignVCenter);
    displayLayout->addWidget(new StudioLabel(text("帧率"), screenSettings), 1, 0, Qt::AlignVCenter);
    displayLayout->addWidget(fpsControl, 1, 1, Qt::AlignVCenter);
    const int settingLabelWidth = fontMetrics().horizontalAdvance(QStringLiteral("Output mode")) + 16;
    interfaceLayout->setColumnStretch(0, 0);
    interfaceLayout->setColumnMinimumWidth(0, settingLabelWidth);
    interfaceLayout->setColumnStretch(1, 1);
    screenSettingsLayout->setContentsMargins(12, 16, 12, 12);
    connectionLayout->setContentsMargins(0, 0, 0, 0);
    displayLayout->setContentsMargins(0, 0, 0, 0);
    const int deviceButtonWidth = qMax(fontMetrics().horizontalAdvance(QStringLiteral("Read screen size")),
                                      fontMetrics().horizontalAdvance(text("读取屏幕尺寸"))) + 28;
    serialScan_->setFixedSize(deviceButtonWidth, 30);
    deviceSize_->setFixedSize(deviceButtonWidth, 30);
    width_->setFixedSize(64, 30);
    height_->setFixedSize(64, 30);
    screenToolbar->setSpacing(10);
    connectionLayout->setColumnMinimumWidth(0, settingLabelWidth);
    displayLayout->setColumnMinimumWidth(0, settingLabelWidth);
    screenSettingsLayout->addLayout(displayLayout);

    // Swap the two library paths without changing the spanning reload button.
    if (auto* libraryGrid = qobject_cast<QGridLayout*>(setup->layout())) {
        struct LibraryCell { QLayoutItem* item; int row; int column; int rowSpan; int columnSpan; };
        QList<LibraryCell> cells;
        while (libraryGrid->count()) {
            int row, column, rowSpan, columnSpan;
            libraryGrid->getItemPosition(0, &row, &column, &rowSpan, &columnSpan);
            cells.append({libraryGrid->takeAt(0), row, column, rowSpan, columnSpan});
        }
        for (const auto& cell : cells) {
            const int row = cell.rowSpan == 1 && cell.row < 2 ? 1 - cell.row : cell.row;
            libraryGrid->addItem(cell.item, row, cell.column, cell.rowSpan, cell.columnSpan);
        }
        interfaceLayout->removeWidget(web);
        libraryGrid->addWidget(web, libraryGrid->rowCount(), 0, 1, libraryGrid->columnCount());
    }

    while (auto* item = controls->takeAt(0)) {
        if (auto* widget = item->widget()) widget->hide();
        delete item;
    }
    for (int column = 0; column < 6; ++column) {
        controls->setColumnStretch(column, 0);
        controls->setColumnMinimumWidth(column, 0);
    }
    auto makeAdjustment = [outputGroup](QSlider* slider, QWidget* editor) {
        auto* widget = new QWidget(outputGroup);
        auto* row = new QHBoxLayout(widget);
        row->setContentsMargins(0, 0, 0, 0);
        row->addWidget(slider, 1, Qt::AlignVCenter);
        row->addWidget(editor, 0, Qt::AlignVCenter);
        slider->show();
        editor->show();
        return widget;
    };
    controls->addWidget(new StudioLabel(text("亮度"), outputGroup), 0, 0, Qt::AlignVCenter);
    controls->addWidget(makeAdjustment(brightnessSlider_, brightness_), 0, 1);
    controls->addWidget(new StudioLabel(text("速度"), outputGroup), 0, 2, Qt::AlignVCenter);
    controls->addWidget(makeAdjustment(speedSlider_, speed_), 0, 3);
    clockLabel_->setText(text("样式"));
    clockLabel_->setProperty("pixelStudioSource_text", text("样式"));
    clockColorLabel_ = new StudioLabel(text("配色"), outputGroup);
    clockColorControls_ = new QWidget(outputGroup);
    auto* colorRow = new QHBoxLayout(clockColorControls_);
    colorRow->setContentsMargins(0, 0, 0, 0);
    colorRow->setSpacing(8);
    const auto customColorButtons = clockControls_->findChildren<QPushButton*>();
    colorRow->addWidget(clockPalette_, 1, Qt::AlignVCenter);
    for (auto* button : customColorButtons) {
        button->setMinimumWidth(0);
        button->setMaximumWidth(QWIDGETSIZE_MAX);
        button->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
        button->setFixedHeight(30);
        colorRow->addWidget(button, 1, Qt::AlignVCenter);
    }
    controls->addWidget(clockLabel_, 1, 0, Qt::AlignVCenter);
    controls->addWidget(clockControls_, 1, 1, Qt::AlignVCenter);
    controls->addWidget(clockColorLabel_, 1, 2, Qt::AlignVCenter);
    controls->addWidget(clockColorControls_, 1, 3, Qt::AlignVCenter);
    for (QWidget* widget : {static_cast<QWidget*>(clockColorLabel_), clockColorControls_}) {
        auto policy = widget->sizePolicy();
        policy.setRetainSizeWhenHidden(true);
        widget->setSizePolicy(policy);
    }
    for (QWidget* widget : {static_cast<QWidget*>(clockLabel_), clockControls_}) {
        auto policy = widget->sizePolicy();
        policy.setRetainSizeWhenHidden(true);
        widget->setSizePolicy(policy);
    }
    controls->setRowMinimumHeight(1, 30);
    outputGroup->setObjectName(QStringLiteral("PixelStudioLiveAdjustments"));
    libraryDialog->setStyleSheet(libraryDialog->styleSheet() + QStringLiteral(
        " QGroupBox { margin-top:16px; padding-top:12px; }"
        " QGroupBox::title { subcontrol-origin:margin; subcontrol-position:top left; left:10px; padding:3px 5px; }"));
    controls->setColumnStretch(1, 1);
    controls->setColumnStretch(3, 1);
    clockFont_->setFixedHeight(30);
    clockPalette_->setFixedHeight(30);
    const QVariant selectedClockPalette = clockPalette_->currentData();
    const int icePaletteIndex = clockPalette_->findData(QStringLiteral("ice"));
    if (icePaletteIndex > 0) {
        const QString iceTitle = clockPalette_->itemText(icePaletteIndex);
        clockPalette_->removeItem(icePaletteIndex);
        clockPalette_->insertItem(0, iceTitle, QStringLiteral("ice"));
        clockPalette_->setCurrentIndex(qMax(0, clockPalette_->findData(selectedClockPalette)));
    }
    clockPalette_->setMinimumWidth(0);
    clockPalette_->setMaximumWidth(QWIDGETSIZE_MAX);
    clockPalette_->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
    // One standard width for editable fields, selectors and adjacent actions.
    const int standardWidth = 180;
    const int settingControlSpan = standardWidth * 2 + 8;
    for (QWidget* widget : {static_cast<QWidget*>(language_), static_cast<QWidget*>(theme_),
         static_cast<QWidget*>(transport_), static_cast<QWidget*>(mapping_),
         static_cast<QWidget*>(serialPort_), static_cast<QWidget*>(host_),
         static_cast<QWidget*>(serialScan_), static_cast<QWidget*>(deviceSize_),
         static_cast<QWidget*>(fps_), static_cast<QWidget*>(projectPath_), static_cast<QWidget*>(nodePath_)})
        widget->setFixedSize(standardWidth, 30);
    for (auto* grid : {interfaceLayout, connectionLayout, displayLayout}) {
        grid->setColumnStretch(0, 1);
        grid->setColumnStretch(1, 0);
        grid->setColumnMinimumWidth(1, settingControlSpan);
        for (int i = 0; i < grid->count(); ++i)
            if (auto* widget = grid->itemAt(i)->widget()) grid->setAlignment(widget, Qt::AlignRight | Qt::AlignVCenter);
    }
    serialControl->setFixedWidth(settingControlSpan);
    settingsAddress->setFixedWidth(settingControlSpan);
    fpsControl->setFixedWidth(settingControlSpan);
    if (serialControl->layout()) serialControl->layout()->setSpacing(8);
    settingsAddressLayout->setSpacing(8);
    if (auto* libraryGrid = qobject_cast<QGridLayout*>(setup->layout())) {
        libraryGrid->setColumnStretch(0, 0);
        libraryGrid->setColumnStretch(1, 1);
        libraryGrid->setHorizontalSpacing(8);
        for (auto* button : setup->findChildren<QPushButton*>()) {
            if (button != web) {
                button->setMinimumWidth(0);
                button->setMaximumWidth(QWIDGETSIZE_MAX);
                button->setFixedHeight(30);
                button->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
            }
        }
        libraryGrid->removeWidget(load_);
        libraryGrid->addWidget(load_, 0, 3, 2, 1, Qt::AlignVCenter);
        libraryGrid->setColumnStretch(2, 0);
        libraryGrid->setColumnStretch(3, 0);
        libraryGrid->removeWidget(web);
        libraryGrid->addWidget(web, 2, 0, 1, 4);
        libraryGrid->setRowMinimumHeight(3, 0);
        for (auto* path : {projectPath_, nodePath_}) {
            path->setMinimumWidth(180);
            path->setMaximumWidth(QWIDGETSIZE_MAX);
            path->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
        }
    }
    // Native-style settings: labels stay on the left; one complete control
    // column is anchored to the right. Composite rows share its outer edges.
    const int rightColumnWidth = 340;
    const int actionWidth = 122;
    for (auto* selector : {language_, theme_, transport_, mapping_})
        selector->setFixedSize(rightColumnWidth, 30);
    serialPort_->setFixedSize(rightColumnWidth - actionWidth - 8, 30);
    host_->setFixedSize(rightColumnWidth - actionWidth - 8, 30);
    serialScan_->setFixedSize(actionWidth, 30);
    deviceSize_->setFixedSize(actionWidth, 30);
    fps_->setFixedSize(88, 30);
    for (auto* composite : {serialControl, settingsAddress, fpsControl})
        composite->setFixedWidth(rightColumnWidth);
    for (auto* grid : {interfaceLayout, connectionLayout, displayLayout}) {
        grid->setColumnMinimumWidth(1, rightColumnWidth);
        grid->setColumnStretch(0, 1);
        grid->setColumnStretch(1, 0);
        for (int i = 0; i < grid->count(); ++i) {
            if (auto* widget = grid->itemAt(i)->widget()) {
                const bool isLabel = qobject_cast<QLabel*>(widget) != nullptr;
                grid->setAlignment(widget, (isLabel ? Qt::AlignLeft : Qt::AlignRight) | Qt::AlignVCenter);
            }
        }
    }
    screenSettingsLayout->removeItem(screenToolbar);
    screenToolbar->removeItem(sizeRow);
    screenToolbar->removeItem(presetRow);
    screenToolbar->removeWidget(cad_);
    delete screenToolbar;
    auto* matrixDimensions = new QWidget(screenSettings);
    auto* dimensionLayout = new QHBoxLayout(matrixDimensions);
    dimensionLayout->setContentsMargins(0, 0, 0, 0);
    dimensionLayout->setSpacing(8);
    dimensionLayout->addLayout(sizeRow);
    dimensionLayout->addStretch(1);
    dimensionLayout->addWidget(cad_, 0, Qt::AlignVCenter);
    matrixDimensions->setFixedWidth(rightColumnWidth);
    auto* matrixPresets = new QWidget(screenSettings);
    auto* presetContainer = new QHBoxLayout(matrixPresets);
    presetContainer->setContentsMargins(0, 0, 0, 0);
    presetContainer->addLayout(presetRow);
    presetContainer->addStretch(1);
    matrixPresets->setFixedWidth(rightColumnWidth);
    addOutputSetting(3, text("屏幕尺寸"), matrixDimensions);
    addOutputSetting(4, text("快捷尺寸"), matrixPresets);
    // The display rows follow immediately after screen dimensions.
    while (displayLayout->count()) {
        int row, column, rowSpan, columnSpan;
        displayLayout->getItemPosition(0, &row, &column, &rowSpan, &columnSpan);
        connectionLayout->addItem(displayLayout->takeAt(0), row + 5, column, rowSpan, columnSpan);
    }
    screenSettingsLayout->removeItem(displayLayout);
    delete displayLayout;
    colorMatching_ = new StudioCombo(screenSettings);
    colorMatching_->addItem(text("匹配网页颜色（推荐）"), true);
    colorMatching_->addItem(text("保留设备颜色"), false);
    colorMatching_->setCurrentIndex(settings.value(QStringLiteral("colorMatching"), true).toBool() ? 0 : 1);
    colorMatching_->setFixedSize(rightColumnWidth, 30);
    gamma_ = new StudioDoubleSpinBox(screenSettings);
    gamma_->setRange(1.0, 4.0);
    gamma_->setDecimals(2);
    gamma_->setSingleStep(0.05);
    gamma_->setValue(settings.value(QStringLiteral("gamma"), 2.8).toDouble());
    gamma_->setFixedSize(rightColumnWidth, 30);
    gamma_->setAlignment(Qt::AlignCenter);
    gamma_->setToolTip(QStringLiteral("USB uses detected device Gamma; unknown or disabled realtime Gamma bypasses compensation.\nUSB 使用设备 Gamma；未知或实时 Gamma 关闭时不补偿。"));
    addOutputSetting(7, text("颜色还原"), colorMatching_);
    // Internal compatibility value only; color matching uses device settings.
    gamma_->hide();
    gamma_->setEnabled(colorMatching_->currentData().toBool());
    liveLayout_ = controls;
    brightnessLabel_ = controls->itemAtPosition(0, 0)->widget();
    brightnessControls_ = controls->itemAtPosition(0, 1)->widget();
    speedLabel_ = controls->itemAtPosition(0, 2)->widget();
    speedControls_ = controls->itemAtPosition(0, 3)->widget();
    // Native labels avoid clipping from the optical text-painting override.
    controls->removeWidget(clockLabel_);
    delete clockLabel_;
    clockLabel_ = new StudioLabel(text("样式"), outputGroup);
    controls->removeWidget(clockColorLabel_);
    delete clockColorLabel_;
    clockColorLabel_ = new StudioLabel(text("配色"), outputGroup);
    for (QWidget** widget : {&brightnessLabel_, &speedLabel_}) {
        controls->removeWidget(*widget);
        delete *widget;
        *widget = new StudioLabel(widget == &brightnessLabel_ ? text("亮度") : text("速度"), outputGroup);
    }
    for (QLabel* label : {qobject_cast<QLabel*>(brightnessLabel_), qobject_cast<QLabel*>(speedLabel_), clockLabel_, clockColorLabel_}) {
        if (!label) continue;
        label->setAlignment(Qt::AlignLeft | Qt::AlignVCenter);
        label->setMinimumWidth(label->fontMetrics().horizontalAdvance(QStringLiteral("Colors")) + 8);
        label->setFixedHeight(36);
        label->setMargin(0);
        label->setContentsMargins(0, 0, 0, 0);
        label->setStyleSheet(QStringLiteral("QLabel { padding:0; margin:0; border:none; background:transparent; }"));
    }
    clockControls_->setFixedHeight(36);
    clockColorControls_->setFixedHeight(36);
    outputGroup->setStyleSheet(QStringLiteral(
        "QGroupBox#PixelStudioLiveAdjustments { border:none; background:transparent; margin:0; padding:0; }"));
    animationColorsButton_ = new StudioButton(text("自定义配色"), outputGroup);
    animationColorsButton_->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
    animationColorsButton_->setFixedHeight(30);
    connect(animationColorsButton_, &QPushButton::clicked, customColorsButton_, &QPushButton::click);
    arrangeLiveControls(false);
    for (auto* button : clockControls_->findChildren<QPushButton*>()) button->setFixedHeight(30);
    for (auto* row : clockControls_->findChildren<QHBoxLayout*>()) {
        row->setContentsMargins(0, 0, 0, 0);
        for (int i = 0; i < row->count(); ++i)
            if (auto* widget = row->itemAt(i)->widget()) row->setAlignment(widget, Qt::AlignVCenter);
    }
    colorRow->insertWidget(0, circuitPalette_, 1, Qt::AlignVCenter);
    circuitPalette_->hide();
    clockPalette_->addItem(text("樱粉"), QStringLiteral("rose"));
    clockPalette_->addItem(text("紫晶"), QStringLiteral("violet"));
    const bool customClockSelected = clockPalette_->currentData().toString() == QStringLiteral("custom");
    clockPalette_->removeItem(clockPalette_->findData(QStringLiteral("custom")));
    clockPalette_->addItem(text("自定义"), QStringLiteral("custom"));
    if (customClockSelected) clockPalette_->setCurrentIndex(clockPalette_->findData(QStringLiteral("custom")));
    circuitPalette_->insertItem(0, english_ ? QStringLiteral("Original") : QStringLiteral("原始"), QStringLiteral("original"));
    circuitPalette_->addItem(text("自定义"), QStringLiteral("custom"));
    circuitPalette_->setCurrentIndex(qMax(0, circuitPalette_->findData(
        settings.value(QStringLiteral("circuitPalette"), QStringLiteral("ice")))));
    connect(customColorsButton_, &QPushButton::clicked, this, [this] {
        if (circuitPalette_->isVisible() && clockPalette_->currentData().toString() == QStringLiteral("custom"))
            circuitPalette_->setCurrentIndex(circuitPalette_->findData(QStringLiteral("custom")));
    });
}
