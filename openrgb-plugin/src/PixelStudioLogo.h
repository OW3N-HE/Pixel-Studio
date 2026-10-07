#pragma once

#include <QColor>
#include <QImage>
#include <QPainter>

// Match the runtime brand-mark with a solid highlight and no glow.
// Crop to the highlight, keeping the artwork's visible size within its original slot.
inline QImage pixelStudioLogo(int size, QColor accent = QColor("#4cc2ff"),
    QColor background = QColor("#151515"), bool = false,
    QColor pixels = QColor(), QColor center = QColor()) {
    if (!center.isValid()) {
        // Keep all Qt logo sizes consistent with the shared web theme colors.
        const auto color = accent.name();
        if (color == QStringLiteral("#83d5f2")) center = QColor("#12212c");
        else if (color == QStringLiteral("#8ee6ba")) center = QColor("#112018");
        else if (color == QStringLiteral("#ffbd75")) center = QColor("#261d14");
        else if (color == QStringLiteral("#efabc6")) center = QColor("#291a24");
        else if (color == QStringLiteral("#549dc5")) center = QColor("#12243e");
        else if (color == QStringLiteral("#c4c4c4")) center = QColor("#303030");
        else if (color == QStringLiteral("#4cc2ff")) center = QColor("#101010");
        else center = QColor("#26282c");
    }
    QImage image(size, size, QImage::Format_ARGB32_Premultiplied);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing);

    const double unit = 32.0 / 52.0;
    const double coreStroke = 2 * unit;
    const QRectF backplate(3.8, 3.8, 24.4, 24.4);
    const double backRadius = 1.6938;
    const QRectF rim = backplate.adjusted(-coreStroke / 2, -coreStroke / 2,
        coreStroke / 2, coreStroke / 2);
    const double rimRadius = backRadius + coreStroke / 2;
    const double viewStart = rim.left() - coreStroke / 2 - 0.5;
    const double viewSize = rim.width() + coreStroke + 1;
    painter.scale(size / viewSize, size / viewSize);
    painter.translate(-viewStart, -viewStart);

    painter.setBrush(Qt::NoBrush);
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
