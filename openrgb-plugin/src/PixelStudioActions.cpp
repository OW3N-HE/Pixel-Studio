#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QGroupBox>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

void PixelStudioPanel::createActionRow(QVBoxLayout* shell, QSettings& settings) {
    auto* actions = new QHBoxLayout;
    actions->setContentsMargins(6, 6, 6, 0);
    start_ = new PlaybackButton(false, this);
    start_->setObjectName(QStringLiteral("PixelStudioStart"));
    start_->setIcon(playbackIcon(false));
    start_->setIconSize(QSize(24, 24));
    start_->setAccessibleName(text("开始播放"));
    start_->setFixedSize(84, 44);
    start_->setToolTip(text("开始 / 无缝应用"));
    stop_ = new PlaybackButton(true, this);
    stop_->setObjectName(QStringLiteral("PixelStudioStop"));
    stop_->setIcon(playbackIcon(true));
    stop_->setIconSize(QSize(24, 24));
    stop_->setAccessibleName(text("停止播放"));
    stop_->setFixedSize(84, 44);
    stop_->setStyleSheet(QStringLiteral(
        "QPushButton { min-width:84px; max-width:84px; min-height:44px; max-height:44px; background:#d95459; border:1px solid #d95459; border-radius:6px; padding:0; }"
        "QPushButton:hover { background:#ed6c71; border-color:#ed6c71; }"
        "QPushButton:pressed { background:#b84048; border-color:#b84048; }"
        "QPushButton:disabled { background:#a84c52; border-color:#a84c52; }"
        "QPushButton:focus { border:2px solid #ffe9ea; }"));
    stop_->setToolTip(text("停止播放"));
    autoStart_ = new StudioCheckBox(text("继续播放"), this);
    autoStart_->setChecked(settings.value(QStringLiteral("autoStart"), false).toBool());
    playbackIntent_ = settings.value(QStringLiteral("wasPlaying"), false).toBool();
    resumeOnReady_ = autoStart_->isChecked() && playbackIntent_;
    actions->addWidget(start_);
    actions->addWidget(stop_);
    actions->addWidget(autoStart_, 0, Qt::AlignVCenter);
    stats_ = new StudioLabel(text("尚未发送 · 目标最高 60 FPS"), this);
    actions->addWidget(stats_);
    shell->addLayout(actions);
    status_ = new StudioLabel(text("正在加载本地动画库，不会自动发送。"), this);
    status_->setWordWrap(false);
    status_->setAlignment(Qt::AlignVCenter | Qt::AlignLeft);
    QSizePolicy statusPolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
    statusPolicy.setRetainSizeWhenHidden(true);
    status_->setSizePolicy(statusPolicy);
    status_->setTextFormat(Qt::PlainText);
    actions->insertWidget(3, status_, 1);
    status_->hide();
}
