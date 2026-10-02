#pragma once
#include <QDialog>
#include <QDesktopServices>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QLabel>
#include <QProcess>
#include <QPushButton>
#include <QStylePainter>
#include <QStyleOptionButton>
#include <QFontMetrics>
#include <QRegularExpression>
#include <QTextEdit>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>
#include <QVersionNumber>

namespace PixelStudioUpdates {
class UpdateButton final : public QPushButton {
public: using QPushButton::QPushButton;
protected: void paintEvent(QPaintEvent*) override {
    QStylePainter painter(this); QStyleOptionButton option; initStyleOption(&option);
    const QString label=option.text; option.text.clear(); painter.drawControl(QStyle::CE_PushButton,option);
    painter.setFont(font()); painter.setPen(palette().color(isEnabled()?QPalette::Active:QPalette::Disabled,QPalette::ButtonText));
    const QRect ink=QFontMetrics(font()).boundingRect(label);
    painter.drawText(QPoint((width()-ink.width())/2-ink.left(),(height()-ink.height())/2-ink.top()),label);
}
};
inline void show(QWidget* parent, bool english, const QString& nodePath) {
    auto tr = [english](const char* zh, const char* en) {
        return QString::fromUtf8(english ? en : zh);
    };
    auto* dialog = new QDialog(parent);
    dialog->setAttribute(Qt::WA_DeleteOnClose);
    dialog->setWindowModality(Qt::WindowModal);
    dialog->setWindowTitle(tr("检查更新", "Check for updates"));
    dialog->resize(540, 380);
    auto* layout = new QVBoxLayout(dialog);
    layout->setContentsMargins(20, 20, 20, 20);
    layout->setSpacing(12);
    auto* status = new QLabel(tr("当前版本：0.2.0。正在检查 GitHub...", "Current version: 0.2.0. Checking GitHub..."), dialog);
    status->setWordWrap(true);
    status->setTextFormat(Qt::PlainText);
    layout->addWidget(status);
    auto* notes = new QTextEdit(dialog);
    notes->setReadOnly(true);
    layout->addWidget(notes);
    auto* hint = new QLabel(tr("仅查询 OW3N-HE/Pixel-Studio 的正式发布。请备份后手动替换；不会自动安装或刷写固件。",
        "Only stable releases from OW3N-HE/Pixel-Studio are checked. Back up and replace files manually; no automatic installation or firmware flashing."), dialog);
    hint->setWordWrap(true);
    layout->addWidget(hint);
    auto* installer = new UpdateButton(tr("下载安装包", "Download installer"), dialog);
    installer->setEnabled(false);
    layout->addWidget(installer);
    auto* installerStatus = new QLabel(tr("检查完成后显示安装包状态。", "Installer availability will appear after checking."), dialog);
    installerStatus->setWordWrap(true);
    layout->addWidget(installerStatus);
    QObject::connect(installer, &QPushButton::clicked, dialog, [installer] {
        const QUrl url(installer->property("installerUrl").toString());
        if (installer->isEnabled() && !url.isEmpty()) QDesktopServices::openUrl(url);
    });
    auto* download = new UpdateButton(tr("打开官方发布页 / 下载", "Open official releases / download"), dialog);
    layout->addWidget(download);
    QObject::connect(download, &QPushButton::clicked, dialog, [] {
        QDesktopServices::openUrl(QUrl(QStringLiteral("https://github.com/OW3N-HE/Pixel-Studio/releases")));
    });
    auto* close = new UpdateButton(tr("关闭", "Close"), dialog);
    layout->addWidget(close);
    QObject::connect(close, &QPushButton::clicked, dialog, &QDialog::close);
    // A short-lived Node process uses the existing runtime, without Qt Network
    // or any changes to OpenRGB's installation directory or playback process.
    auto* process = new QProcess(dialog);
    auto* timer = new QTimer(process);
    timer->setSingleShot(true);
    QObject::connect(timer, &QTimer::timeout, process, [process] { process->kill(); });
    QObject::connect(process, &QProcess::errorOccurred, dialog, [status, installerStatus, timer, tr](QProcess::ProcessError error) {
        if (error == QProcess::FailedToStart) {
            timer->stop();
            installerStatus->hide();
            status->setText(tr("无法启动 Node.js，请在设置中选择有效的 Node.js 程序。",
                "Unable to start Node.js. Select a valid Node.js executable in Settings."));
        }
    });
    QObject::connect(process, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished), dialog,
        [process, timer, status, notes, installer, installerStatus, tr](int exitCode, QProcess::ExitStatus exitStatus) {
        timer->stop();
        installerStatus->hide();
        const auto result = QJsonDocument::fromJson(process->readAllStandardOutput()).object();
        const int http = result.value(QStringLiteral("status")).toInt();
        if (exitStatus == QProcess::NormalExit && exitCode == 0 && http == 404) {
            status->setText(tr("尚未发布正式版本。", "No stable release has been published yet."));
        } else if (exitStatus != QProcess::NormalExit || exitCode != 0 || http != 200) {
            status->setText(tr("检查失败，请检查网络或稍后重试（可能触发 GitHub 请求限额）。",
                "Unable to check. Check your connection or GitHub rate limits, then retry."));
        } else {
            const auto release = result.value(QStringLiteral("release")).toObject();
            const QString tag = release.value(QStringLiteral("tag_name")).toString();
            const auto match = QRegularExpression(QStringLiteral("^v?(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$")).match(tag);
            const auto version = QVersionNumber::fromString(tag.startsWith(QLatin1Char('v')) ? tag.mid(1) : tag);
            if (!match.hasMatch() || version.segmentCount() != 3 || release.value(QStringLiteral("draft")).toBool()
                || release.value(QStringLiteral("prerelease")).toBool()) {
                status->setText(tr("发布版本号格式无法识别，请查看发布页面。", "Unsupported release version. Please check the release page."));
            } else {
                const int comparison = QVersionNumber::compare(version, QVersionNumber(0, 2, 0));
                status->setText(comparison > 0
                    ? tr("发现新版本：%1（当前版本：0.2.0）", "New version: %1 (current: 0.2.0)").arg(tag)
                    : comparison == 0 ? tr("当前已是最新版本（0.2.0）。", "You are up to date (0.2.0).")
                    : tr("本地版本 0.2.0 高于已发布版本 %1，不提供降级安装。", "Local version 0.2.0 is newer than published version %1. No downgrade is offered.").arg(tag));
                if (comparison >= 0) {
                    const QString name = QStringLiteral("PixelStudio-Setup-%1.exe").arg(version.toString());
                    const QString expectedUrl = QStringLiteral("https://github.com/OW3N-HE/Pixel-Studio/releases/download/%1/%2").arg(tag, name);
                    for (const auto& value : release.value(QStringLiteral("assets")).toArray()) {
                        const auto asset = value.toObject();
                        if (asset.value(QStringLiteral("name")).toString() == name
                            && asset.value(QStringLiteral("state")).toString() == QStringLiteral("uploaded")
                            && asset.value(QStringLiteral("size")).toDouble() > 0
                            && asset.value(QStringLiteral("browser_download_url")).toString() == expectedUrl) {
                            installer->setProperty("installerUrl", expectedUrl);
                            installer->setEnabled(true);
                            break;
                        }
                    }
                    installerStatus->setText(installer->isEnabled()
                        ? tr("仅下载。请备份文件、退出 OpenRGB，再手动运行安装程序；不会刷写固件。", "Download only. Back up your files, close OpenRGB, then run the installer manually. Firmware is not flashed.")
                        : tr("此版本暂无安装包，可前往发布页下载便携压缩包。", "No installer is attached to this release yet. Portable packages remain available on the release page."));
                    installerStatus->show();
                }
                notes->setPlainText(release.value(QStringLiteral("body")).toString().left(6000));
            }
        }
    });
    const QString script = QString::fromLatin1(R"JS(
const https = require('https');
const req = https.get('https://api.github.com/repos/OW3N-HE/Pixel-Studio/releases/latest', {
  headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'PixelStudio/0.2.0'}
}, res => {
  let size = 0;
  const chunks = [];
  res.on('data', chunk => {
    size += chunk.length;
    if (size > 1048576) { res.destroy(); req.destroy(); process.exitCode = 1; return; }
    chunks.push(chunk);
  });
  res.on('error', () => { process.exitCode = 1; });
  res.on('end', () => {
    try {
      const release = res.statusCode === 200 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
      process.stdout.write(JSON.stringify({status: res.statusCode, release}));
    } catch { process.exitCode = 1; }
  });
});
req.setTimeout(12000, () => req.destroy(new Error('timeout')));
req.on('error', () => { process.exitCode = 1; });
)JS");
    timer->start(15000);
    process->start(nodePath.trimmed().isEmpty() ? QStringLiteral("node") : nodePath.trimmed(),
        QStringList{QStringLiteral("-e"), script});
    dialog->show();
}
}
