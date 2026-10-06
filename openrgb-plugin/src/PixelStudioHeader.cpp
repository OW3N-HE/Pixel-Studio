#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include "PixelStudioLogo.h"
#include <QDesktopServices>
#include <QDir>
#include <QFileInfo>
#include <QMessageBox>
#include <QUrl>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

PixelStudioPanel::HeaderParts PixelStudioPanel::createHeader(
    QVBoxLayout* shell, QSettings& settings) {
    auto* title = new StudioLabel(QStringLiteral("PIXEL STUDIO"), this);
    title->setObjectName(QStringLiteral("PixelStudioTitle"));
    auto titleFont = title->font();
    titleFont.setPointSize(titleFont.pointSize() + 6);
    titleFont.setBold(true);
    title->setFont(titleFont);
    auto* heading = new QHBoxLayout;
    // Shell 6px + row 6px = the shared 12px edge, independent of resizing.
    heading->setContentsMargins(6, 0, 6, 0);
    // Same eight-pixel mark as the web header, drawn natively for crisp DPI scaling.
    auto* brandMark = new StudioLabel(this);
    QPixmap brandPixmap = QPixmap::fromImage(pixelStudioLogo(80, QColor("#4cc2ff"), QColor("#151515"), true));
    brandPixmap.setDevicePixelRatio(2.0);
    brandMark->setPixmap(brandPixmap);
    brandMark->setObjectName(QStringLiteral("PixelStudioBrandLogo"));
    brandMark->setFixedSize(40, 40);
    heading->addWidget(brandMark, 0, Qt::AlignVCenter);
    heading->addSpacing(6);
    heading->addWidget(title);
    heading->addStretch();
    auto* web = new StudioButton(text("打开独立网页版"), this);
    language_ = new StudioCombo(this);
    language_->setObjectName(QStringLiteral("PixelStudioLanguageLeft"));
    language_->setAccessibleName(text("界面语言"));
    language_->setToolTip(text("界面语言"));
    language_->addItem(text("跟随 OpenRGB"), QStringLiteral("auto"));
    language_->addItem(text("简体中文"), QStringLiteral("zh"));
    language_->addItem(QStringLiteral("English"), QStringLiteral("en"));
    language_->setCurrentIndex(qMax(0, language_->findData(settings.value(QStringLiteral("language"), QStringLiteral("auto")))));
    language_->setSizeAdjustPolicy(QComboBox::AdjustToContents);
    web->setFixedSize(180, 28);
    language_->setFixedSize(180, 28);
    auto* languageRow = new QHBoxLayout;
    auto* settingsButton = new SettingsButton(this);
    settingsButton->setFixedSize(40, 40);
    settingsButton->setToolTip(text("设置"));
    settingsButton->setAccessibleName(text("设置"));
    heading->addWidget(settingsButton, 0, Qt::AlignVCenter);
    auto* languageLabel = new StudioLabel(text("语言"), this);
    languageLabel->setBuddy(language_);
    auto languageFont = languageLabel->font();
    languageFont.setBold(true);
    languageLabel->setFont(languageFont);
    languageRow->addStretch(1);
    languageRow->addWidget(languageLabel);
    languageRow->addWidget(language_);
    languageRow->addStretch(1);
    shell->insertLayout(0, heading);
    connect(web, &QPushButton::clicked, this, [this, settingsFile = settings.fileName()] {
        const QSettings preferences(settingsFile, QSettings::IniFormat);
        const QSettings userInstall(QStringLiteral("HKEY_CURRENT_USER\\Software\\PixelStudio\\Installer"), QSettings::NativeFormat);
        const QSettings machineInstall(QStringLiteral("HKEY_LOCAL_MACHINE\\Software\\PixelStudio\\Installer"), QSettings::NativeFormat);
        const QStringList roots {
            preferences.value(QStringLiteral("project")).toString(),
            userInstall.value(QStringLiteral("ProjectPath")).toString(),
            machineInstall.value(QStringLiteral("ProjectPath")).toString(),
            QString::fromUtf8(PIXEL_STUDIO_PROJECT_ROOT)
        };
        for (const QString& root : roots) {
            if (root.trimmed().isEmpty()) continue;
            const QFileInfo page(QDir(root).absoluteFilePath(QStringLiteral("index.html")));
            if (!page.isFile() || !page.isReadable()) continue;
            if (!QDesktopServices::openUrl(QUrl::fromLocalFile(page.absoluteFilePath()))) {
                QMessageBox::warning(this, QStringLiteral("Pixel Studio"),
                    QStringLiteral("Unable to open the standalone web page in your browser.\n"
                                   "无法使用浏览器打开独立网页版。\n\n") + page.absoluteFilePath());
            }
            return;
        }
        QMessageBox::warning(this, QStringLiteral("Pixel Studio"),
            QStringLiteral("Cannot find index.html. Check the animation library folder or reinstall Pixel Studio.\n"
                           "找不到 index.html。请检查动画库目录或重新安装 Pixel Studio。"));
    });

    return {web, languageRow, settingsButton, languageLabel};
}
