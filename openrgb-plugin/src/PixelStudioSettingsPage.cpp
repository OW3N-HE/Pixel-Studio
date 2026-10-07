#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include "PixelStudioUpdates.h"
#include <QDialog>
#include <QDialogButtonBox>
#include <QGroupBox>
#include <QDate>
#include <QLocale>

PixelStudioPanel::SettingsPageParts PixelStudioPanel::createSettingsPage(
    QSettings& settings, QHBoxLayout* languageRow, QLabel* languageLabel,
    QPushButton* web, QPushButton* settingsButton, QGroupBox* setup,
    QHBoxLayout* screenToolbar) {
    auto* libraryDialog = new QDialog(this);
    libraryDialog->setWindowTitle(text("设置"));
    libraryDialog->setProperty("pixelStudioSource_windowTitle", text("设置"));
    auto* libraryDialogLayout = new QVBoxLayout(libraryDialog);
    libraryDialogLayout->setSpacing(14);
    libraryDialogLayout->setContentsMargins(16, 16, 16, 16);
    delete languageRow;
    auto* interfaceSettings = new QGroupBox(text("界面设置"), libraryDialog);
    auto* interfaceLayout = new QGridLayout(interfaceSettings);
    interfaceLayout->setContentsMargins(12, 16, 12, 12);
    interfaceLayout->setHorizontalSpacing(24);
    interfaceLayout->setVerticalSpacing(12);
    interfaceLayout->setColumnStretch(0, 1);
    interfaceLayout->setColumnStretch(1, 1);
    theme_ = new StudioCombo(libraryDialog);
    theme_->addItem(text("冰蓝"), QStringLiteral("ice"));
    theme_->addItem(text("薄荷"), QStringLiteral("mint"));
    theme_->addItem(text("琥珀"), QStringLiteral("amber"));
    theme_->addItem(text("樱粉"), QStringLiteral("rose"));
    theme_->addItem(text("深蓝"), QStringLiteral("ocean"));
    theme_->addItem(text("灰色"), QStringLiteral("dark"));
    theme_->setCurrentIndex(qMax(0, theme_->findData(settings.value(QStringLiteral("theme"), QStringLiteral("ice")))));
    theme_->setFixedSize(180, 30);
    auto* themeLabel = new StudioLabel(text("主题"), libraryDialog);
    auto settingLabelFont = languageLabel->font();
    settingLabelFont.setBold(false);
    languageLabel->setFont(settingLabelFont);
    themeLabel->setFont(settingLabelFont);
    themeLabel->setBuddy(theme_);
    for (auto* selector : {language_, theme_}) {
        selector->setMinimumWidth(220);
        selector->setMaximumWidth(QWIDGETSIZE_MAX);
        selector->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
    }
    interfaceLayout->addWidget(languageLabel, 0, 0, Qt::AlignVCenter);
    interfaceLayout->addWidget(language_, 0, 1);
    interfaceLayout->addWidget(themeLabel, 1, 0, Qt::AlignVCenter);
    interfaceLayout->addWidget(theme_, 1, 1);
    web->setMinimumWidth(0);
    web->setMaximumWidth(QWIDGETSIZE_MAX);
    web->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
    interfaceLayout->addWidget(web, 2, 0, 1, 2);
    web->setAutoDefault(false);
    web->setDefault(false);
    libraryDialogLayout->addWidget(interfaceSettings);
    auto* screenSettings = new QGroupBox(text("屏幕设置"), libraryDialog);
    auto* screenSettingsLayout = new QVBoxLayout(screenSettings);
    screenSettingsLayout->addLayout(screenToolbar);
    libraryDialogLayout->addWidget(screenSettings);
    libraryDialogLayout->addWidget(setup);
    libraryDialog->resize(680, 320);
    connect(settingsButton, &QPushButton::clicked, libraryDialog, [libraryDialog] {
        libraryDialog->show();
        libraryDialog->raise();
        libraryDialog->activateWindow();
    });
    auto* updateButton = new StudioButton(text("检查更新"), libraryDialog);
    updateButton->setAutoDefault(false);
    libraryDialog->layout()->addWidget(updateButton);
    connect(updateButton, &QPushButton::clicked, this, [this, libraryDialog] {
        PixelStudioUpdates::show(libraryDialog, english_, nodePath_->text());
    });
    auto* aboutButton = new StudioButton(text("关于 Pixel Studio"), libraryDialog);
    libraryDialog->layout()->addWidget(aboutButton);
    connect(aboutButton, &QPushButton::clicked, this, [this, libraryDialog] {
        QDialog about(libraryDialog);
        about.setWindowTitle(english_ ? QStringLiteral("About Pixel Studio") : text("关于 Pixel Studio"));
        about.setMinimumWidth(480);
        auto* layout = new QVBoxLayout(&about);
        layout->setContentsMargins(24, 24, 24, 24);
        layout->setSpacing(16);
        auto* heading = new QLabel(QStringLiteral("Pixel Studio"), &about);
        QFont headingFont = heading->font(); headingFont.setPointSize(20); headingFont.setBold(true);
        heading->setFont(headingFont); layout->addWidget(heading);
        const auto buildDate = QLocale::c().toDate(QString::fromLatin1(__DATE__).simplified(), QStringLiteral("MMM d yyyy")).toString(QStringLiteral("yyyy/MM/dd"));
        auto* version = new QLabel(english_
        ? QStringLiteral("Version 0.2.2 · OpenRGB plugin\nBuilt: %1").arg(buildDate)
        : text("版本 0.2.2 · OpenRGB 插件\n编译日期：%1").arg(buildDate), &about);
        layout->addWidget(version);
        auto* description = new QLabel(english_
            ? QStringLiteral("Small pixels. Endless imagination.\n\nA pixel animation studio for WLED. The web app and OpenRGB plugin share an animation library, with live previews, custom palettes and USB / Adalight or DDP output.\n\nAuthors & collaborators\nGPT-5.3 Codex Spark · GPT-5.6 Sol · GPT-6 Sol · GPT-6 Astra · GPT-6.1 Sol\nOWEN\n\nCreated through AI and human collaboration: AI collaborators contribute to design and development; OWEN guides the product, visual direction and device feedback.\n\nSpecial thanks: David Wang · Mango Akuma · Mark Peng · SSSSWILK · &#xff1f · 3FC\n\nIndependent project. Thanks to the WLED, OpenRGB, Qt and Node.js communities. Not an official WLED or OpenRGB release.")
            : text("方寸像素，无限想象。\n\n为 WLED 打造的像素动画工作室。网页版与 OpenRGB 插件共享动画库，支持实时预览、自定义配色，以及 USB / Adalight 和 DDP 输出。\n\n作者与协作成员\nGPT-5.3 Codex Spark · GPT-5.6 Sol · GPT-6 Sol · GPT-6 Astra · GPT-6.1 Sol\nOWEN\n\n由 AI 与人类共同创作：AI 协作成员参与设计和开发；OWEN 主导产品方向、视觉取舍与设备体验反馈。\n\n特别感谢：David Wang · Mango Akuma · Mark Peng · SSSSWILK · &#xff1f · 3FC\n\n独立项目，感谢 WLED、OpenRGB、Qt 与 Node.js 社区。本项目不是 WLED 或 OpenRGB 的官方发行版。"), &about);
        description->setTextFormat(Qt::PlainText); description->setWordWrap(true); description->setMaximumWidth(560);
        description->setTextInteractionFlags(Qt::TextSelectableByMouse);
        layout->addWidget(description);
        auto* sensorCredits = new QLabel(english_
            ? QStringLiteral("Temperature monitoring: thanks to LibreHardwareMonitor and its contributors for the hardware monitoring library, and to PawnIO for low-level hardware access.")
            : text("温度采集：感谢 LibreHardwareMonitor 及其贡献者提供硬件监控库，感谢 PawnIO 提供底层硬件访问支持。"), &about);
        sensorCredits->setWordWrap(true);
        sensorCredits->setMaximumWidth(560);
        sensorCredits->setTextInteractionFlags(Qt::TextSelectableByMouse);
        layout->addWidget(sensorCredits);
        auto* buttons = new QDialogButtonBox(&about);
        auto* closeButton = new StudioButton(english_ ? QStringLiteral("Close") : text("关闭"), &about);
        closeButton->setMinimumSize(88, 32);
        buttons->addButton(closeButton, QDialogButtonBox::RejectRole);
        connect(buttons, &QDialogButtonBox::rejected, &about, &QDialog::reject);
        layout->addWidget(buttons); about.exec();
    });
    return {libraryDialog, interfaceLayout, screenSettings, screenSettingsLayout};
}
