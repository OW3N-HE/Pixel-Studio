#pragma once

#include <QImage>
#include <QPainter>

inline QImage pixelStudioLogo(int size, QColor accent = QColor("#83d5f2"), QColor background = QColor("#0c161d")) {
    QImage image(size, size, QImage::Format_ARGB32_Premultiplied);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing);
    painter.setPen(Qt::NoPen);
    painter.scale(size / 32.0, size / 32.0);
    // Reserve space for the halo so the icon remains unclipped at small sizes.
    const QRectF bezel(3, 3, 26, 26);
    const double tile = (24.4 - 4 * 0.8) / 3;
    const double radius = tile * 0.8 / 6.325;
    const double bezelRadius = radius + 1.6;
    painter.setBrush(Qt::NoBrush);
    for (int stroke = 6; stroke >= 1; --stroke) {
        QColor halo = accent;
        halo.setAlpha(stroke == 1 ? 190 : 16);
        painter.setPen(QPen(halo, stroke));
        painter.drawRoundedRect(bezel, bezelRadius, bezelRadius);
    }
    painter.setPen(Qt::NoPen);
    painter.setBrush(background);
    painter.drawRoundedRect(bezel.adjusted(0.8, 0.8, -0.8, -0.8), bezelRadius - 0.8, bezelRadius - 0.8);
    for (int row = 0; row < 3; ++row) {
        for (int column = 0; column < 3; ++column) {
            const bool center = row == 1 && column == 1;
            painter.setBrush(center ? background.lighter(150) :
                (row == 2 && column == 2 ? QColor("#ffffff") : accent));
            painter.drawRoundedRect(QRectF(4.6 + column * (tile + 0.8), 4.6 + row * (tile + 0.8), tile, tile), radius, radius);
        }
    }
    painter.end();
    return image;
}
