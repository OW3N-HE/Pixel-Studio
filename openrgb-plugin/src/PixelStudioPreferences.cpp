#include <QStyleOptionFrame>
#include <QMessageBox>
#include <QRandomGenerator>
#include "PixelStudioPanel.h"
#include "PixelStudioUpdates.h"
#include "PixelStudioTranslations.h"
#include "PixelStudioLogo.h"
#include <QColorDialog>
#include <QDialogButtonBox>
#include <QRegularExpression>
#include <QSettings>
#include <QPalette>
#include <QTextLayout>

#include <QAbstractButton>
#include <QAbstractSpinBox>
#include <QApplication>
#include <QLocale>
#include <QScrollArea>
#include <QScrollBar>
#include <QScreen>
#include <QStyledItemDelegate>
#include <QStylePainter>
#include <QStyleOptionButton>
#include <QStyleOptionComboBox>
#include <QTabWidget>
#include <QCheckBox>
#include <QComboBox>
#include <QDesktopServices>
#include <QDialog>
#include <QDir>
#include <QDoubleSpinBox>
#include <QEvent>
#include <QFileDialog>
#include <QFileInfo>
#include <QFont>
#include <QFormLayout>
#include <QGridLayout>
#include <QGroupBox>
#include <QHBoxLayout>
#include <QIcon>
#include <QImage>
#include <QInputDialog>
#include <QJsonArray>
#include <QJsonDocument>
#include <QLabel>
#include <QLineEdit>
#include <QKeyEvent>
#include <QMouseEvent>
#include <QListWidget>
#include <QPainter>
#include <QPainterPath>
#include <QPaintEvent>
#include <QShowEvent>
#include <QHideEvent>
#include <QtMath>
#include <QPixmap>
#include <QPolygonF>
#include <QProcess>
#include <QPushButton>
#include <QSlider>
#include <QSettings>
#include <QSignalBlocker>
#include <QSizePolicy>
#include <QSpinBox>
#include <QStandardPaths>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>

#include "PixelStudioSupport.h"

namespace PixelStudioSupport {
QSettings preferences() {
    const QString directory = QDir(QStandardPaths::writableLocation(QStandardPaths::GenericConfigLocation))
        .filePath(QStringLiteral("Pixel Studio for OpenRGB"));
    const QString file = QDir(directory).filePath(QStringLiteral("OpenRGBPlugin.ini"));
    if (!QFileInfo::exists(file) && QDir().mkpath(directory)) {
        const QSettings legacy(QSettings::IniFormat, QSettings::UserScope,
                               QStringLiteral("PixelStudio"), QStringLiteral("OpenRGBPlugin"));
        if (QFileInfo::exists(legacy.fileName())) QFile::copy(legacy.fileName(), file);
    }
    return QSettings(file, QSettings::IniFormat);
}
}
using namespace PixelStudioSupport;

void PixelStudioPanel::savePreferences() {
    auto settings = preferences();
    if (thermalSampling_) {
        if (!thermalMode_.isEmpty()) thermalPreferencesByMode_.insert(thermalMode_, thermalConfiguration());
        settings.setValue(QStringLiteral("thermalByMode"), QJsonDocument(thermalPreferencesByMode_).toJson(QJsonDocument::Compact));
    }
    settings.setValue(QStringLiteral("language"), language_->currentData());
    settings.setValue(QStringLiteral("project"), projectPath_->text().trimmed());
    settings.setValue(QStringLiteral("node"), nodePath_->text().trimmed());
    settings.setValue(QStringLiteral("host"), host_->text().trimmed());
    settings.setValue(QStringLiteral("transport"), transport_->currentData());
    settings.setValue(QStringLiteral("serialPort"), serialPort_->text().trimmed());
    settings.setValue(QStringLiteral("width"), width_->value());
    settings.setValue(QStringLiteral("height"), height_->value());
    settings.setValue(QStringLiteral("brightness"), brightness_->value());
    settings.setValue(QStringLiteral("fps"), fps_->value());
    settings.setValue(QStringLiteral("colorMatching"), colorMatching_->currentData().toBool());
    settings.setValue(QStringLiteral("gamma"), gamma_->value());
    settings.setValue(QStringLiteral("speed"), speed_->value());
    settings.setValue(QStringLiteral("clockFont"), clockFont_->currentData());
    settings.setValue(QStringLiteral("clockPalette"), clockPalette_->currentData());
    settings.setValue(QStringLiteral("circuitPalette"), circuitPalette_->currentData());
    settings.setValue(QStringLiteral("favorites"), QStringList(favoriteModes_.begin(), favoriteModes_.end()));
    settings.setValue(QStringLiteral("randomDuration"), randomDuration_->value());
    settings.setValue(QStringLiteral("customClockPalette"), customClockPalette_);
    settings.setValue(QStringLiteral("cad"), cad_->isChecked());
    settings.setValue(QStringLiteral("autoStart"), autoStart_->isChecked());
    settings.setValue(QStringLiteral("wasPlaying"), playbackIntent_);
    if (gallery_->currentItem()) {
        savedMode_ = gallery_->currentItem()->data(Qt::UserRole).toString();
        settings.setValue(QStringLiteral("mode"), savedMode_);
    }
    if (mapping_->currentIndex() >= 0) {
        settings.setValue(QStringLiteral("mapping"), mapping_->currentData());
        mapping_->setProperty("preferred", mapping_->currentData());
    }
}

void PixelStudioPanel::restoreFavoritePreferences(QSettings& settings) {
    for (const auto& id : settings.value(QStringLiteral("favorites")).toStringList())
        favoriteModes_.insert(id);
}
