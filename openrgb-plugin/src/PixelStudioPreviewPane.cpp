#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

// The board remains a workspace child so its halo can extend past the pane.
PixelStudioPanel::PreviewParts PixelStudioPanel::createPreviewPane(
    QWidget* workspace, QSettings& settings) {
    auto* previewPane = new QWidget(workspace);
    previewPane->setMinimumWidth(64);
    previewPane->setMaximumWidth(QWIDGETSIZE_MAX);
    auto* previewLayout = new QVBoxLayout(previewPane);
    previewLayout->setContentsMargins(0, 0, 8, 0);
    previewLayout->setSpacing(6);
    auto* sizeRow = new QHBoxLayout;
    width_ = new StudioSpinBox(previewPane);
    height_ = new StudioSpinBox(previewPane);
    for (auto* spin : { width_, height_ }) spin->setRange(1, 128);
    width_->setValue(15);
    height_->setValue(27);
    sizeRow->addWidget(new StudioLabel(text("宽"), previewPane));
    sizeRow->addWidget(width_);
    sizeRow->addWidget(new StudioLabel(text("高"), previewPane));
    sizeRow->addWidget(height_);
    auto* size15 = new StudioButton(QStringLiteral("15 x 27"), previewPane);
    auto* size14 = new StudioButton(QStringLiteral("14 x 26"), previewPane);
    auto* presetRow = new QHBoxLayout;
    presetRow->addWidget(size15);
    presetRow->addWidget(size14);
    auto* boardSlot = new QWidget(previewPane);
    boardSlot->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    outputBoard_ = new PixelBoard(workspace);
    previewLayout->addWidget(boardSlot, 1);
    cad_ = new StudioCheckBox(text("圆角预览"), previewPane);
    cad_->setChecked(settings.value(QStringLiteral("cad"), true).toBool());
    outputBoard_->setCadAppearance(cad_->isChecked());
    outputBoard_->setToolTip(text("预览持续播放；播放按钮只控制设备输出。"));
    // Keep the controls packed at the top; spare height belongs below the
    // screen rather than becoming gaps between the heading and size inputs.
    previewLayout->addStretch(1);
    connect(cad_, &QCheckBox::toggled, outputBoard_, &PixelBoard::setCadAppearance);
    connect(size15, &QPushButton::clicked, this, [this] { width_->setValue(15); height_->setValue(27); });
    connect(size14, &QPushButton::clicked, this, [this] { width_->setValue(14); height_->setValue(26); });

    return {previewPane, sizeRow, presetRow, size15, size14, boardSlot};
}
