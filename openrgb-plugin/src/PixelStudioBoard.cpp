#include "PixelStudioPanel.h"
#include <QEvent>
#include <QShowEvent>
#include <QHideEvent>
#include <QLayout>
#include <QPaintEvent>
#include <QPainter>
#include <QPainterPath>
#include <QTimer>
#include <QtMath>

PixelBoard::PixelBoard(QWidget* parent) : QWidget(parent) {
    setMinimumSize(0, 0);
    setProperty("matrixColumns", columns_);
    setProperty("matrixRows", rows_);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Expanding);
    pixels_.fill('\0', columns_ * rows_ * 3);
    glowTimer_ = new QTimer(this);
    glowTimer_->setTimerType(Qt::PreciseTimer);
    glowTimer_->setInterval(8);
    connect(glowTimer_, &QTimer::timeout, this, [this] {
        if (isVisible() && !window()->isMinimized()) {
            if (glowRegion_.isEmpty()) update();
            else update(glowRegion_);
        }
    });
}
void PixelBoard::setFrame(int width, int height, const QByteArray& rgb) {
    if (width < 1 || height < 1 || width > 128 || height > 128
        || width * height > 4096 || rgb.size() != width * height * 3) return;
    const bool dimensionsChanged = columns_ != width || rows_ != height;
    if (!dimensionsChanged && pixels_ == rgb) return;
    columns_ = width;
    rows_ = height;
    if (dimensionsChanged) {
        glowCache_ = QImage();
        setProperty("matrixColumns", columns_);
        setProperty("matrixRows", rows_);
        if (parentWidget() && parentWidget()->parentWidget())
            parentWidget()->parentWidget()->layout()->invalidate();
        updateGeometry();
    }
    pixels_ = rgb;
    update();
}
void PixelBoard::setCadAppearance(bool enabled) {
    if (cad_ == enabled) return;
    cad_ = enabled;
    glowCache_ = QImage();
    update();
}
void PixelBoard::setThemeColors(const QColor& accent, const QColor& idle) {
    if (accent_ == accent && idleBorder_ == idle) return;
    accent_ = accent;
    idleBorder_ = idle;
    glowCache_ = QImage();
    update();
}
void PixelBoard::setPlaying(bool playing) {
    if (playing_ == playing) return;
    playing_ = playing;
    if (playing_) glowClock_.restart();
    syncGlowTimer();
    update();
}
void PixelBoard::syncGlowTimer() {
    const bool visible = isVisible() && window()->isVisible() && !window()->isMinimized();
    const bool animate = playing_ && visible;
    if (animate && !glowTimer_->isActive()) glowTimer_->start();
    else if (!animate) glowTimer_->stop();
    emit presentationChanged(visible);
}
void PixelBoard::showEvent(QShowEvent* event) {
    QWidget::showEvent(event);
    QWidget* host = window();
    if (observedWindow_.data() != host) {
        if (observedWindow_) observedWindow_->removeEventFilter(this);
        observedWindow_ = host;
        if (host != this) host->installEventFilter(this);
    }
    syncGlowTimer();
}
void PixelBoard::hideEvent(QHideEvent* event) {
    glowTimer_->stop();
    emit presentationChanged(false);
    QWidget::hideEvent(event);
}
bool PixelBoard::eventFilter(QObject* watched, QEvent* event) {
    if (watched == observedWindow_.data()) {
        if (event->type() == QEvent::Hide) emit presentationChanged(false);
        if (event->type() == QEvent::Hide || event->type() == QEvent::Close)
            glowTimer_->stop();
        else if (event->type() == QEvent::WindowStateChange || event->type() == QEvent::Show)
            syncGlowTimer();
    }
    return QWidget::eventFilter(watched, event);
}
void PixelBoard::paintEvent(QPaintEvent* event) {
    QPainter painter(this);
    // Leave unused layout space transparent instead of painting a wide dark box.
    // The visible screen fits its matrix aspect ratio at every window size.
    const double gapRatio = cad_ ? 0.8 / 7.125 : 0.0;
    // The canvas extends 6px outside its layout slot. A 3.5px bright-rim
    // outset plus that extension keeps the rim aligned with the slot while
    // leaving room for the full 8px halo and antialiasing.
    // Use the same bounds when idle so playback never changes the pixel size.
    const double haloOutset = 9.5;
    const double pitch = qMax(0.1, qMin((width() - 2.0 * haloOutset) / (columns_ + gapRatio),
                                       (height() - 2.0 * haloOutset) / (rows_ + gapRatio)));
    const double x0 = (width() - columns_ * pitch) / 2.0;
    const double y0 = (height() - rows_ * pitch) / 2.0;
    const double inset = pitch * gapRatio / 2.0;
    // From the outside edge to the first pixel is 2 * inset, exactly the
    // same width as the gap between adjacent pixel apertures.
    const QRectF screen(x0 - inset, y0 - inset,
                        columns_ * pitch + 2 * inset, rows_ * pitch + 2 * inset);
    const double screenRadius = cad_ ? pitch * (0.8 / 7.125) + 2 * inset : 0.0;
    // Only the outer strips need a repaint for the breathing animation.
    const int innerMargin = qCeil(screenRadius) + 1;
    glowRegion_ = QRegion(rect()).subtracted(QRegion(screen.adjusted(innerMargin, innerMargin, -innerMargin, -innerMargin).toAlignedRect()));
    if (playing_) {
        const qreal dpr = devicePixelRatioF();
        const QSize physical(qCeil(width() * dpr), qCeil(height() * dpr));
        if (glowCache_.size() != physical || glowCache_.devicePixelRatio() != dpr) {
            glowCache_ = QImage(physical, QImage::Format_ARGB32_Premultiplied);
            glowCache_.setDevicePixelRatio(dpr);
            glowCache_.fill(Qt::transparent);
            QPainter glow(&glowCache_);
            glow.setRenderHint(QPainter::Antialiasing);
            glow.setBrush(Qt::NoBrush);
            const QRectF bezel = screen.adjusted(-2, -2, 2, 2);
            for (int stroke = 10; stroke >= 1; --stroke) {
                QColor halo = accent_;
                halo.setAlpha(stroke == 1 ? 200 : 15);
                glow.setPen(QPen(halo, stroke + 2));
                glow.drawRoundedRect(bezel, screenRadius + 2, screenRadius + 2);
            }
        }
        const double breath = 0.72 + 0.28 * qCos(glowClock_.elapsed() * 6.283185307179586 / 3800.0);
        painter.save();
        painter.setOpacity(breath);
        painter.drawImage(QPoint(0, 0), glowCache_);
        painter.restore();
    } else {
        // Keep the same bezel geometry while idle, without an active halo.
        painter.save();
        painter.setRenderHint(QPainter::Antialiasing);
        painter.setBrush(Qt::NoBrush);
        painter.setPen(QPen(idleBorder_, 3));
        painter.drawRoundedRect(screen.adjusted(-2, -2, 2, 2), screenRadius + 2, screenRadius + 2);
        painter.restore();
    }
    painter.setRenderHint(QPainter::Antialiasing, cad_);
    QPainterPath screenShape;
    screenShape.addRoundedRect(screen, screenRadius, screenRadius);
    painter.fillPath(screenShape, QColor("#000000"));
    painter.setPen(Qt::NoPen);
    painter.setRenderHint(QPainter::Antialiasing, cad_);
    // Front aperture measured from the user's CAD: pitch 7.125, opening 6.325, R0.8.
    const double radius = pitch * (0.8 / 7.125);
    for (int y = 0; y < rows_; ++y) {
        for (int x = 0; x < columns_; ++x) {
            const int i = (y * columns_ + x) * 3;
            const QRectF cell(x0 + x * pitch + inset, y0 + y * pitch + inset,
                              pitch - 2 * inset, pitch - 2 * inset);
            if (!event->region().intersects(cell.toAlignedRect())) continue;
            painter.setBrush(QColor(static_cast<unsigned char>(pixels_[i]),
                                    static_cast<unsigned char>(pixels_[i + 1]),
                                    static_cast<unsigned char>(pixels_[i + 2])));
            if (cad_) painter.drawRoundedRect(cell, radius, radius);
            else painter.drawRect(cell);
        }
    }
}

