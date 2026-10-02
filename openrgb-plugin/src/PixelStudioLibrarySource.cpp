#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QGroupBox>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include <QDir>
#include <QFileInfo>
#include <QFileDialog>
#include <QStandardPaths>

QGroupBox* PixelStudioPanel::createLibrarySource(QSettings& settings) {
    auto* setup = new QGroupBox(text("动画库来源 · 通常无需更改"), this);
    auto* setupLayout = new QGridLayout(setup);
    const QSettings installed(QStringLiteral("HKEY_CURRENT_USER\\Software\\PixelStudio\\Installer"), QSettings::NativeFormat);
    const QSettings machineInstalled(QStringLiteral("HKEY_LOCAL_MACHINE\\Software\\PixelStudio\\Installer"), QSettings::NativeFormat);
    QString installedProject = installed.value(QStringLiteral("ProjectPath")).toString();
    if (!QFileInfo::exists(QDir(installedProject).filePath(QStringLiteral("index.html"))))
        installedProject = machineInstalled.value(QStringLiteral("ProjectPath")).toString();
    QString project = settings.value(QStringLiteral("project"),
        installedProject.isEmpty() ? QString::fromUtf8(PIXEL_STUDIO_PROJECT_ROOT) : installedProject).toString();
    const QString temporaryRoot = QDir::fromNativeSeparators(QDir::tempPath()) + QStringLiteral("/PixelStudio-OpenRGB-");
    const bool migrateTemporary = QDir::fromNativeSeparators(project).startsWith(temporaryRoot, Qt::CaseInsensitive)
        && !installedProject.isEmpty()
        && QFileInfo::exists(QDir(installedProject).filePath(QStringLiteral("index.html")));
    if (migrateTemporary) { project = installedProject; settings.setValue(QStringLiteral("project"), project); }
    projectPath_ = new StudioLineEdit(project, setup);
    QString node = installed.value(QStringLiteral("NodePath")).toString();
    if (!QFileInfo::exists(node)) node = machineInstalled.value(QStringLiteral("NodePath")).toString();
    if (node.isEmpty()) node = QStandardPaths::findExecutable(QStringLiteral("node"));
    if (node.isEmpty()) node = QStringLiteral("C:/Program Files/nodejs/node.exe");
    if (migrateTemporary && QFileInfo::exists(node)) settings.setValue(QStringLiteral("node"), node);
    nodePath_ = new StudioLineEdit(settings.value(QStringLiteral("node"), node).toString(), setup);
    auto* browseProject = new StudioButton(text("选择目录"), setup);
    auto* browseNode = new StudioButton(text("选择程序"), setup);
    load_ = new StudioButton(text("加载动画库"), setup);
    setupLayout->addWidget(new StudioLabel(text("网页项目"), setup), 0, 0);
    setupLayout->addWidget(projectPath_, 0, 1);
    setupLayout->addWidget(browseProject, 0, 2);
    setupLayout->addWidget(load_, 0, 3, 2, 1);
    setupLayout->addWidget(new StudioLabel(QStringLiteral("Node.js"), setup), 1, 0);
    setupLayout->addWidget(nodePath_, 1, 1);
    setupLayout->addWidget(browseNode, 1, 2);
    setupLayout->setColumnStretch(1, 1);
    connect(browseProject, &QPushButton::clicked, this, [this] {
        const auto selected = QFileDialog::getExistingDirectory(this, localized(text("选择 Pixel Studio 网页项目")), projectPath_->text());
        if (!selected.isEmpty()) projectPath_->setText(selected);
    });
    connect(browseNode, &QPushButton::clicked, this, [this] {
        const auto selected = QFileDialog::getOpenFileName(this, localized(text("选择 Node.js")), nodePath_->text(), QStringLiteral("Node.js (node.exe)"));
        if (!selected.isEmpty()) nodePath_->setText(selected);
    });
    connect(load_, &QPushButton::clicked, this, &PixelStudioPanel::boot);

    return setup;
}
