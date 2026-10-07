#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include "PixelStudioLogo.h"

void PixelStudioPanel::applyTheme() {
    const QString key = theme_->currentData().toString();
    QColor accent("#8ee6ba"), border("#304b3b"), background("#0b1510"), idle("#425b51");
    if (key == QStringLiteral("amber")) {
        accent = QColor("#ffbd75"); border = QColor("#64503a");
        background = QColor("#19130d"); idle = QColor("#695743");
    } else if (key == QStringLiteral("ice")) {
        accent = QColor("#83d5f2"); border = QColor("#345567");
        background = QColor("#0c161d"); idle = QColor("#425d6b");
    } else if (key == QStringLiteral("rose")) {
        accent = QColor("#efabc6"); border = QColor("#654453");
        background = QColor("#1b1118"); idle = QColor("#68515d");
    } else if (key == QStringLiteral("ocean")) {
        accent = QColor("#549dc5"); border = QColor("#416b91");
        background = QColor("#111b36"); idle = border;
    } else if (key == QStringLiteral("dark")) {
        accent = QColor("#c4c4c4"); border = QColor("#565656");
        background = QColor("#111111"); idle = QColor("#707070");
    }
    // Native host controls retain OpenRGB's palette; themes color custom artwork.
    setPalette(QApplication::palette());
    outputBoard_->setThemeColors(accent, idle);
    if (auto* logo = findChild<QLabel*>(QStringLiteral("PixelStudioBrandLogo"))) {
        const qreal dpr = devicePixelRatioF();
        const bool neutral = key == QStringLiteral("dark");
        QImage image = pixelStudioLogo(qRound(logo->width() * dpr), accent,
            QColor("#151515"), true, neutral ? QColor("#686868") : accent,
            neutral ? QColor("#303030") : QColor());
        image.setDevicePixelRatio(dpr);
        logo->setPixmap(QPixmap::fromImage(image));
    }
    gallery_->setProperty("studioAccent", accent);
    gallery_->setProperty("studioBorder", border);
    gallery_->setProperty("studioBackground", background);
    gallery_->setStyleSheet(QStringLiteral("QListWidget { background:%1; border:1px solid %2; border-radius:9px; padding:0; }"
        "QListWidget::item { border:none; padding:0; background:transparent; }"
        "QListWidget::item:selected { border:none; background:transparent; }").arg(background.name(), border.name()));
    // The rounded well paints its own background; a rectangular viewport fill
    // would spill over its corners. Keep the viewport transparent instead.
    gallery_->viewport()->setAutoFillBackground(false);
    QWidget* settingsWindow = theme_->window();
    if (settingsWindow != window()) {
        if (!settingsWindow->property("studioNativeStyle").isValid())
            settingsWindow->setProperty("studioNativeStyle", settingsWindow->styleSheet());
        settingsWindow->setStyleSheet(settingsWindow->property("studioNativeStyle").toString()
            + QStringLiteral(" QGroupBox { border:1px solid %1; border-radius:8px; }").arg(border.name()));
    }
    start_->setStyleSheet(QStringLiteral(
        "QPushButton { min-width:84px; max-width:84px; min-height:44px; max-height:44px; background:%1; border:1px solid %1; border-radius:6px; padding:0; }"
        "QPushButton:hover { background:%2; }"
        "QPushButton:pressed { background:%3; }"
        "QPushButton:disabled { background:%4; border-color:%4; }")
        .arg(accent.name(), accent.lighter(110).name(), accent.darker(115).name(), idle.name()));
    gallery_->viewport()->update();
}
void PixelStudioPanel::arrangeLiveControls(bool clockSelected, bool paletteSelected) {
    if (!liveLayout_) return;
    const int layoutMode = clockSelected ? 1 : paletteSelected ? 2 : 0;
    if (liveLayout_->property("layoutMode").isValid()
        && liveLayout_->property("layoutMode").toInt() == layoutMode) return;
    liveLayout_->setProperty("layoutMode", layoutMode);
    while (auto* item = liveLayout_->takeAt(0)) delete item;
    for (QWidget* widget : {static_cast<QWidget*>(clockLabel_), clockControls_,
                           static_cast<QWidget*>(clockColorLabel_), clockColorControls_}) {
        auto policy = widget->sizePolicy();
        policy.setRetainSizeWhenHidden(false);
        widget->setSizePolicy(policy);
        widget->setVisible(clockSelected || paletteSelected);
    }
    animationColorsButton_->setVisible(paletteSelected);
    liveLayout_->addWidget(brightnessLabel_, 0, 0, Qt::AlignVCenter);
    if (clockSelected || paletteSelected) {
        liveLayout_->addWidget(brightnessControls_, 0, 1, Qt::AlignVCenter);
        liveLayout_->addWidget(speedLabel_, 0, 2, Qt::AlignVCenter);
        liveLayout_->addWidget(speedControls_, 0, 3, Qt::AlignVCenter);
        if (clockSelected) {
            liveLayout_->addWidget(clockLabel_, 1, 0, Qt::AlignVCenter);
            liveLayout_->addWidget(clockControls_, 1, 1, Qt::AlignVCenter);
            liveLayout_->addWidget(clockColorLabel_, 1, 2, Qt::AlignVCenter);
            liveLayout_->addWidget(clockColorControls_, 1, 3, Qt::AlignVCenter);
        } else {
            clockLabel_->hide();
            clockControls_->hide();
            liveLayout_->addWidget(clockColorLabel_, 1, 0, Qt::AlignVCenter);
            liveLayout_->addWidget(clockColorControls_, 1, 1, Qt::AlignVCenter);
            liveLayout_->addWidget(animationColorsButton_, 1, 2, 1, 2, Qt::AlignVCenter);
        }
    } else {
        customColorsButton_->hide();
        animationColorsButton_->hide();
        liveLayout_->addWidget(brightnessControls_, 0, 1, 1, 3, Qt::AlignVCenter);
        liveLayout_->addWidget(speedLabel_, 1, 0, Qt::AlignVCenter);
        liveLayout_->addWidget(speedControls_, 1, 1, 1, 3, Qt::AlignVCenter);
    }
    liveLayout_->setContentsMargins(6, 0, 6, 0);
    clockFont_->ensurePolished();
    customColorsButton_->ensurePolished();
    const int controlHeight = qMax(30, qMax(clockFont_->sizeHint().height(), customColorsButton_->sizeHint().height()));
    liveLayout_->setRowMinimumHeight(0, controlHeight);
    liveLayout_->setRowMinimumHeight(1, controlHeight);
    // Identical row metrics for the plain, clock and palette arrangements.
    for (QWidget* widget : {brightnessLabel_, brightnessControls_, speedLabel_, speedControls_,
                           static_cast<QWidget*>(clockLabel_), clockControls_,
                           static_cast<QWidget*>(clockColorLabel_), clockColorControls_}) {
        widget->setFixedHeight(controlHeight);
    }
    const int labelWidth = qMax(qMax(brightnessLabel_->sizeHint().width(), speedLabel_->sizeHint().width()),
        qMax(clockLabel_->fontMetrics().horizontalAdvance(clockLabel_->text()),
             clockColorLabel_->fontMetrics().horizontalAdvance(clockColorLabel_->text()))) + 8;
    liveLayout_->setColumnMinimumWidth(0, labelWidth);
    liveLayout_->setColumnMinimumWidth(2, labelWidth);
    for (auto* combo : {clockFont_, clockPalette_, circuitPalette_}) combo->setFixedHeight(controlHeight);
    liveLayout_->setAlignment(Qt::AlignTop);
    liveLayout_->setVerticalSpacing(12);
    for (QWidget* container : {brightnessControls_, speedControls_, clockControls_, clockColorControls_}) {
        if (container->layout()) {
            container->layout()->setContentsMargins(0, 0, 0, 0);
            container->layout()->setAlignment(Qt::AlignVCenter);
        }
    }
    customColorsButton_->setFixedHeight(controlHeight);
    animationColorsButton_->setFixedHeight(controlHeight);
    liveLayout_->parentWidget()->setFixedHeight(12 + controlHeight * 2);
    liveLayout_->setRowStretch(0, 0);
    liveLayout_->setRowStretch(1, 0);
}
