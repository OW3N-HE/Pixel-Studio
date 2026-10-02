#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QGroupBox>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include <QDialog>

void PixelStudioPanel::applyInitialControlMetrics(QPushButton* settingsButton, QDialog* libraryDialog) {
    // Apply font rules to every control, overriding the host's serif widget
    // stylesheet rather than changing only the panel's inherited QFont.
    setStyleSheet(styleSheet() + QStringLiteral(
        " QWidget#PixelStudioPanel QWidget { font-family:'Segoe UI','Microsoft YaHei UI','Microsoft YaHei'; font-size:10pt; }"
        " QWidget#PixelStudioPanel QLabel#PixelStudioTitle { font-size:20pt; font-weight:bold; }"
        " QWidget#PixelStudioPanel QPushButton { min-height:24px; padding:0px 8px; text-align:center; }"
        " QWidget#PixelStudioPanel QComboBox { min-height:24px; padding:0px 6px; }"
        " QWidget#PixelStudioPanel QSpinBox, QWidget#PixelStudioPanel QDoubleSpinBox { min-height:24px; padding-top:0px; padding-bottom:0px; }"));
    libraryDialog->setStyleSheet(QStringLiteral(
        "QWidget { font-family:'Segoe UI','Microsoft YaHei UI','Microsoft YaHei'; font-size:10pt; }"));
    // Match the native editor rectangles to the 28px button/selector row.
    // Native editors and adjacent labels share an unshifted vertical center.
    for (auto* edit : findChildren<QLineEdit*>()) {
        centerEditorInk(edit);
        connect(edit, &QLineEdit::textChanged, edit, [edit] { centerEditorInk(edit); });
        edit->setAlignment(Qt::AlignVCenter | Qt::AlignLeft);
        if (!qobject_cast<QAbstractSpinBox*>(edit->parentWidget())) edit->setFixedHeight(30);
    }
    host_->setMinimumWidth(host_->fontMetrics().horizontalAdvance(QStringLiteral("255.255.255.255")) + 24);
    for (auto* spin : findChildren<QAbstractSpinBox*>()) spin->setFixedHeight(30);
    for (auto* combo : findChildren<QComboBox*>()) combo->setFixedHeight(30);
    for (auto* slider : findChildren<QSlider*>()) slider->setFixedHeight(30);
    for (auto* button : findChildren<QPushButton*>()) {
        if (button != start_ && button != stop_ && button != settingsButton) button->setFixedHeight(30);
    }
    autoStart_->setFixedHeight(44);
    serialScan_->setFixedSize(88, 30);
    fps_->setFixedSize(88, 30);
}

void PixelStudioPanel::finalizeControlMetrics(const OutputParts& output, const PreviewParts& preview, const HeaderParts& header) {
    auto* controls = output.controls;
    auto* settingsButton = header.settingsButton;
    auto* size15 = preview.preset15;
    auto* size14 = preview.preset14;
    brightness_->setFixedSize(88, 30);
    speed_->setFixedSize(88, 30);
    fps_->setAlignment(Qt::AlignCenter);
    brightness_->setAlignment(Qt::AlignCenter);
    speed_->setAlignment(Qt::AlignCenter);
    // The host stylesheet can otherwise shrink the fixed-size button's height.
    settingsButton->setStyleSheet(QStringLiteral("QPushButton { min-height:40px; max-height:40px; padding:0; }"));
    applyTheme();
    connect(theme_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] {
        applyTheme();
        auto prefs = preferences();
        prefs.setValue(QStringLiteral("theme"), theme_->currentData());
    });
    for (int i = 0; i < controls->count(); ++i) {
        if (auto* widget = controls->itemAt(i)->widget()) controls->setAlignment(widget, Qt::AlignVCenter);
    }
    for (auto* spin : {width_, height_}) {
        spin->setFixedWidth(72);
        spin->setAlignment(Qt::AlignCenter);
    }
    size15->setFixedWidth(72);
    size14->setFixedWidth(72);
}
