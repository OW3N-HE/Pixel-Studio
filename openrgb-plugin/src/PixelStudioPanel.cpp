#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QFont>
#include <QScrollArea>
#include <QTimer>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

PixelStudioPanel::PixelStudioPanel(bool darkTheme, QWidget* parent) : QWidget(parent) {
    setObjectName(QStringLiteral("PixelStudioPanel"));
    // Logical pixels: Windows applies the user's display scaling separately.
    setMinimumSize(0, 0);
    QFont interfaceFont;
    interfaceFont.setFamilies(QStringList{QStringLiteral("Segoe UI"), QStringLiteral("Microsoft YaHei UI"), QStringLiteral("Microsoft YaHei")});
    interfaceFont.setPointSize(10);
    interfaceFont.setStyleHint(QFont::SansSerif);
    setFont(interfaceFont);
    auto settings = preferences();
    restoreFavoritePreferences(settings);
    auto* shell = new QVBoxLayout(this);
    shell->setSizeConstraint(QLayout::SetNoConstraint);
    shell->setContentsMargins(0, 0, 0, 0);
    auto* scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setMinimumSize(0, 0);
    scroll->setVerticalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    auto* content = new QWidget(scroll);
    auto* outer = new QVBoxLayout(content);
    outer->setSizeConstraint(QLayout::SetMinimumSize);
    scroll->setWidget(content);
    // QScrollArea enables background filling on its content by default.
    // Let the native panel show through without a second dark backplate.
    content->setAutoFillBackground(false);
    scroll->viewport()->setAutoFillBackground(false);
    shell->setContentsMargins(6, 12, 6, 12);
    shell->setSpacing(6);
    shell->addWidget(scroll, 1);
    outer->setContentsMargins(0, 0, 0, 0);
    outer->setSpacing(10);
    const auto header = createHeader(shell, settings);
    auto* setup = createLibrarySource(settings);
    auto* workspace = new QWidget(this);
    auto* workspaceLayout = new PreviewWorkspaceLayout(workspace);
    workspaceLayout->viewport = scroll->viewport();
    // The board extends 6px past its alignment slot. Reserve that space in
    // the parent too, otherwise QWidget clips the halo at the workspace edge.
    workspaceLayout->setContentsMargins(6, 6, 6, 6);
    workspaceLayout->setSpacing(4);
    const auto preview = createPreviewPane(workspace, settings);
    workspaceLayout->preview = preview.pane;
    workspaceLayout->board = outputBoard_;
    workspaceLayout->boardSlot = preview.boardSlot;
    const auto [libraryPane, filterRow] = createLibrary(workspace);
    workspaceLayout->library = libraryPane;
    workspaceLayout->addWidget(preview.pane, 0, Qt::AlignTop);
    workspaceLayout->addWidget(libraryPane, 1, Qt::AlignTop);
    outer->addWidget(workspace, 1);
    const auto output = createOutputControls(shell, settings, preview.dimensions, preview.presets);
    createActionRow(shell, settings);
    const auto page = createSettingsPage(settings, header.languageRow, header.languageLabel,
        header.web, header.settingsButton, setup, output.screenToolbar);
    savedMode_ = settings.value(QStringLiteral("mode"), QStringLiteral("portrait_fireflies")).toString();

    Q_UNUSED(darkTheme);

    applyInitialControlMetrics(header.settingsButton, page.dialog);
    arrangeSettingsAndLiveControls(settings, output, preview, header, page, setup);
    createShuffleControls(settings, filterRow);
    finalizeControlMetrics(output, preview, header);
    initializePlayback();
    initializeHelper();
    updateControls();
    languageUiReady_ = true;
    retranslateUi();
    // Host insertion may affect automatic language detection; never resize the host.
    QTimer::singleShot(0, this, [this] { retranslateUi(); });
    QTimer::singleShot(0, this, [this] { boot(); });
}

PixelStudioPanel::~PixelStudioPanel() { shutdown(); }

