#pragma once

#include <QColor>
#include <QImage>
#include <QPainter>

// Match the runtime brand-mark: 2px core at 52px, with 4.5px of outer glow.
// Header artwork explicitly enables glow; plugin/tab icons keep only the core.
inline QImage pixelStudioLogo(int size, QColor accent = QColor("#4cc2ff"),
    QColor background = QColor("#151515"), bool withGlow = false,
    QColor pixels = QColor(), QColor center = QColor("#2b2b2b")) {
    QImage image(size, size, QImage::Format_ARGB32_Premultiplied);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing);

    const double unit = 32.0 / 52.0;
    const double coreStroke = 2 * unit;
    const double outerStroke = (withGlow ? 11 : 2) * unit;
    const QRectF backplate(3.8, 3.8, 24.4, 24.4);
    const double backRadius = 1.6938;
    const QRectF rim = backplate.adjusted(-coreStroke / 2, -coreStroke / 2,
        coreStroke / 2, coreStroke / 2);
    const double rimRadius = backRadius + coreStroke / 2;
    const double viewStart = rim.left() - outerStroke / 2 - 0.5;
    const double viewSize = rim.width() + outerStroke + 1;
    painter.scale(size / viewSize, size / viewSize);
    painter.translate(-viewStart, -viewStart);

    painter.setBrush(Qt::NoBrush);
    if (withGlow) {
        for (int stroke = 11; stroke >= 3; --stroke) {
            QColor halo = accent;
            halo.setAlphaF(0.085);
            painter.setPen(QPen(halo, stroke * unit));
            painter.drawRoundedRect(rim, rimRadius, rimRadius);
        }
    }
    // The filled core prevents a transparent seam; its inner edge meets black.
    painter.setPen(QPen(accent, coreStroke));
    painter.setBrush(background);
    painter.drawRoundedRect(rim, rimRadius, rimRadius);
    painter.setPen(Qt::NoPen);
    painter.drawRoundedRect(backplate, backRadius, backRadius);

    const double tile = (24.4 - 4 * 0.8) / 3;
    const double radius = 0.8938;
    const QColor tileColor = pixels.isValid() ? pixels : accent;
    for (int row = 0; row < 3; ++row) {
        for (int column = 0; column < 3; ++column) {
            const bool isCenter = row == 1 && column == 1;
            painter.setBrush(isCenter ? center :
                (row == 2 && column == 2 ? QColor("#ffffff") : tileColor));
            painter.drawRoundedRect(QRectF(4.6 + column * (tile + 0.8),
                4.6 + row * (tile + 0.8), tile, tile), radius, radius);
        }
    }
    painter.end();
    return image;
}
