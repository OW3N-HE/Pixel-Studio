#pragma once
#include <QSettings>
#include <QImage>
#include <QStringList>

namespace PixelStudioSupport {
inline QString text(const char* value) { return QString::fromUtf8(value); }
QSettings preferences();
inline QImage rgbImage(int width, int height, const QByteArray& rgb) {
    if (width < 1 || height < 1 || width > 128 || height > 128
        || width * height > 4096 || rgb.size() != width * height * 3) return {};
    QImage image(width, height, QImage::Format_RGB32);
    for (int y = 0; y < height; ++y) {
        auto* row = reinterpret_cast<QRgb*>(image.scanLine(y));
        for (int x = 0; x < width; ++x) {
            const int i = (y * width + x) * 3;
            row[x] = qRgb(static_cast<unsigned char>(rgb[i]),
                          static_cast<unsigned char>(rgb[i + 1]),
                          static_cast<unsigned char>(rgb[i + 2]));
        }
    }
    return image;
}
inline QString categoryForMode(const QString& id) {
    if (id.startsWith(QStringLiteral("hand_"))) return QStringLiteral("handmade");
    if (id == QStringLiteral("clock") || id == QStringLiteral("thermal_icons")
        || id == QStringLiteral("thermal_digits") || id == QStringLiteral("thermal_labels")
        || id == QStringLiteral("thermal_gauges")) return QStringLiteral("info");
    static const QStringList nature = {
        QStringLiteral("fox"), QStringLiteral("capybara"), QStringLiteral("owl"),
        QStringLiteral("axolotl"), QStringLiteral("snail"), QStringLiteral("bees"),
        QStringLiteral("mushroom"), QStringLiteral("butterfly"), QStringLiteral("koi"),
        QStringLiteral("fish"), QStringLiteral("cat"), QStringLiteral("bamboo"),
        QStringLiteral("flower"), QStringLiteral("bloom"), QStringLiteral("greenhouse")
    };
    for (const auto& word : nature) if (id.contains(word)) return QStringLiteral("nature");
    static const QStringList ambience = {
        QStringLiteral("aurora"), QStringLiteral("meteor"), QStringLiteral("sunset"),
        QStringLiteral("lantern"), QStringLiteral("city"), QStringLiteral("mountain"),
        QStringLiteral("candle"), QStringLiteral("waterfall"), QStringLiteral("galaxy"),
        QStringLiteral("tunnel"), QStringLiteral("rain"), QStringLiteral("snow"),
        QStringLiteral("fire"), QStringLiteral("lava"), QStringLiteral("night"),
        QStringLiteral("sakura"), QStringLiteral("lighthouse"), QStringLiteral("circuit")
    };
    for (const auto& word : ambience) if (id.contains(word)) return QStringLiteral("ambience");
    return QStringLiteral("playful");
}
}

