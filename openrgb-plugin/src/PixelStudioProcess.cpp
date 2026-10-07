#include "PixelStudioPanel.h"
#include "PixelStudioSupport.h"
#include <QDir>
#include <QFileInfo>
#include <QLineEdit>
#include <QSpinBox>
#include <QProcess>
#include <QTimer>
using namespace PixelStudioSupport;

void PixelStudioPanel::initializeHelper() {
    helper_ = new QProcess(this);
    connect(outputBoard_, &PixelBoard::presentationChanged, this, &PixelStudioPanel::syncPresentation);
    helper_->setProcessChannelMode(QProcess::SeparateChannels);
    connect(helper_, &QProcess::readyReadStandardOutput, this, &PixelStudioPanel::consumeOutput);
    connect(helper_, &QProcess::readyReadStandardError, this, [this] {
        const auto detail = QString::fromUtf8(helper_->readAllStandardError()).trimmed();
        if (!closing_ && !detail.isEmpty()) showStatus(detail.right(600), true);
    });
    connect(helper_, &QProcess::errorOccurred, this, [this](QProcess::ProcessError) {
        if (closing_) return;
        ready_ = false;
        busy_ = false;
        updateControls();
        showStatus(text("本地动画进程无法运行：%1"), true, {helper_->errorString()});
    });
    connect(helper_, qOverload<int, QProcess::ExitStatus>(&QProcess::finished), this,
            [this](int exitCode, QProcess::ExitStatus exitStatus) {
        heartbeat_->stop();
        ready_ = false;
        busy_ = false;
        streaming_ = false;
        updateControls();
        if (!closing_) {
            playbackIntent_ = false;
            resumeOnReady_ = false;
            savePreferences();
            showStatus(text("动画进程已退出。可重新加载动画库；未自动重连或发送。 (%1/%2)"),
                true, {QString::number(exitCode), QString::number(static_cast<int>(exitStatus))});
        }
    });
    heartbeat_ = new QTimer(this);
    heartbeat_->setInterval(2000);
    connect(heartbeat_, &QTimer::timeout, this, [this] {
        send(QStringLiteral("ping"));
        // Retry a visibility notification if the pipe was busy. Playback and
        // sensor work do not depend on the preview being visible.
        syncPresentation(outputBoard_->isVisible() && outputBoard_->window()->isVisible()
            && !outputBoard_->window()->isMinimized());
    });
    connect(helper_, &QProcess::started, this, [this] { heartbeat_->start(); });
}

void PixelStudioPanel::syncPresentation(bool visible) {
    if (!ready_ || closing_ || !helper_ || helper_->state() != QProcess::Running
        || helper_->bytesToWrite() > 65536) return;
    if (presentationKnown_ && presentationVisible_ == visible) return;
    send(QStringLiteral("presentation"), QJsonObject{{QStringLiteral("visible"), visible}});
    presentationKnown_ = true;
    presentationVisible_ = visible;
}

void PixelStudioPanel::boot() {
    if (busy_ || streaming_) {
        showStatus(text("请先停止本插件的播放，再重新加载动画库。"), true);
        return;
    }
    if (helper_->state() != QProcess::NotRunning) shutdown();
    closing_ = false;
    ready_ = false;
    presentationKnown_ = false;
    presentationVisible_ = false;
    busy_ = false;
    input_.clear();
    savePreferences();
    const auto root = QDir::cleanPath(projectPath_->text().trimmed());
    const auto hostScript = QDir(root).filePath(QStringLiteral("openrgb-plugin/pixel-studio-host.cjs"));
    if (!QFileInfo::exists(hostScript) || !QFileInfo::exists(QDir(root).filePath(QStringLiteral("index.html")))
        || !QFileInfo::exists(QDir(root).filePath(QStringLiteral("pixel-headless-renderer.cjs")))) {
        showStatus(text("请选择包含 index.html 和 openrgb-plugin 的完整项目目录。"), true);
        updateControls();
        return;
    }
    const auto node = nodePath_->text().trimmed();
    if (!QFileInfo::exists(node)) {
        showStatus(text("未找到 Node.js，请选择 node.exe。"), true);
        updateControls();
        return;
    }
    showStatus(text("正在读取共享动画库，只生成本地预览。"));
    helper_->setWorkingDirectory(root);
    helper_->setProgram(node);
    helper_->setArguments(QStringList{hostScript, QStringLiteral("--project"), root});
    helper_->start();
    updateControls();
}

void PixelStudioPanel::shutdown() {
    if (closing_) return;
    closing_ = true;
    if (debounce_) debounce_->stop();
    if (heartbeat_) heartbeat_->stop();
    savePreferences();
    if (helper_ && helper_->state() != QProcess::NotRunning) {
        send(QStringLiteral("shutdown"));
        helper_->closeWriteChannel();
        if (!helper_->waitForFinished(8000)) {
            // Only our stdio helper is terminated. The shared web/DDP service is not.
            helper_->kill();
            helper_->waitForFinished(1000);
        }
    }
    ready_ = false;
    busy_ = false;
    streaming_ = false;
}

