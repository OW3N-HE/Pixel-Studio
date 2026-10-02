#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include <QVBoxLayout>
#include <QKeyEvent>
#include <QTimer>

PixelStudioPanel::LibraryParts PixelStudioPanel::createLibrary(QWidget* workspace) {
    auto* libraryPane = new QWidget(workspace);
    auto* libraryLayout = new QVBoxLayout(libraryPane);
    libraryLayout->setContentsMargins(0, 0, 0, 0);
    libraryLayout->setSpacing(7);
    auto* filterRow = new QHBoxLayout;
    filterRow->setSpacing(7);
    category_ = new StudioCombo(libraryPane);
    category_->setObjectName(QStringLiteral("PixelStudioCategory"));
    category_->addItem(text("全部"), QStringLiteral("all"));
    category_->addItem(text("收藏"), QStringLiteral("favorites"));
    category_->addItem(text("自然"), QStringLiteral("nature"));
    category_->addItem(text("氛围"), QStringLiteral("ambience"));
    category_->addItem(text("趣味"), QStringLiteral("playful"));
    category_->addItem(text("信息"), QStringLiteral("info"));
    category_->addItem(text("手绘"), QStringLiteral("handmade"));
    search_ = new StudioLineEdit(libraryPane);
    search_->setPlaceholderText(text("搜索"));
    search_->setClearButtonEnabled(true);
    search_->installEventFilter(this);
    filterRow->addWidget(category_);
    filterRow->addWidget(search_, 1);
    libraryLayout->addLayout(filterRow);
    gallery_ = new AnimationGallery(libraryPane);
    gallery_->viewport()->installEventFilter(this);
    gallery_->setViewMode(QListView::IconMode);
    gallery_->setResizeMode(QListView::Adjust);
    gallery_->setMovement(QListView::Static);
    gallery_->setSelectionMode(QAbstractItemView::SingleSelection);
    gallery_->setIconSize(QSize(45, 81));
    gallery_->setItemDelegate(new AnimationCardDelegate(gallery_));
    gallery_->setUniformItemSizes(true);
    gallery_->setGridSize(QSize(112, 195));
    gallery_->setSpacing(0);
    gallery_->setWordWrap(true);
    gallery_->setMinimumSize(112, 0);
    auto* galleryRegion = new QWidget(libraryPane);
    auto* galleryRow = new QHBoxLayout(galleryRegion);
    galleryRow->setContentsMargins(0, 0, 0, 0);
    galleryRow->setSpacing(6);
    galleryRow->addWidget(gallery_, 1);
    // Preserve the native sibling scrollbar outside the rounded gallery.
    auto* galleryScroll = new QScrollBar(Qt::Vertical, galleryRegion);
    galleryRow->addWidget(galleryScroll);
    auto* internalScroll = gallery_->verticalScrollBar();
    connect(internalScroll, &QScrollBar::rangeChanged, galleryScroll,
        [galleryScroll, internalScroll](int minimum, int maximum) {
            galleryScroll->setRange(minimum, maximum);
            galleryScroll->setPageStep(internalScroll->pageStep());
            galleryScroll->setSingleStep(internalScroll->singleStep());
        });
    connect(internalScroll, &QScrollBar::valueChanged, galleryScroll, &QScrollBar::setValue);
    connect(galleryScroll, &QScrollBar::valueChanged, internalScroll, &QScrollBar::setValue);
    libraryLayout->addWidget(galleryRegion, 1);
    auto* libraryNote = new StudioLabel(text("播放中切换卡片会无缝更新灯板；未播放时只更改预览。"), libraryPane);
    libraryNote->setWordWrap(true);
    libraryNote->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Minimum);
    libraryNote->hide();
    gallery_->setToolTip(libraryNote->text());
    connect(search_, &QLineEdit::textChanged, this, [this] { filterGallery(); });
    connect(category_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] { filterGallery(); });

    return {libraryPane, filterRow};
}

void PixelStudioPanel::filterGallery() {
    const auto query = search_->text().trimmed();
    gallery_->setProperty("studioSearching", !query.isEmpty());
    const auto category = category_->currentData().toString();
    for (int i = 0; i < gallery_->count(); ++i) {
        auto* item = gallery_->item(i);
        const auto source = item->data(Qt::UserRole + 10).toString();
        const bool textMatch = source.contains(query, Qt::CaseInsensitive)
            || PixelStudioI18n::english(source).contains(query, Qt::CaseInsensitive)
            || item->data(Qt::UserRole).toString().contains(query, Qt::CaseInsensitive);
        const bool categoryMatch = category == QStringLiteral("all")
            || (category == QStringLiteral("favorites") && favoriteModes_.contains(item->data(Qt::UserRole).toString()))
            || item->data(Qt::UserRole + 1).toString() == category;
        item->setHidden(!textMatch || !categoryMatch);
    }
    static_cast<AnimationGallery*>(gallery_)->scheduleCardLayout();
}
bool PixelStudioPanel::eventFilter(QObject* watched, QEvent* event) {
    if (watched == search_ && event->type() == QEvent::Resize && randomDuration_) {
        const int height = search_->height();
        if (randomDuration_->height() != height) randomDuration_->setFixedHeight(height);
        if (randomPlayback_->height() != height) randomPlayback_->setFixedHeight(height);
    }
    if (watched == search_ && event->type() == QEvent::KeyPress
        && static_cast<QKeyEvent*>(event)->key() == Qt::Key_Escape) {
        search_->clear();
        search_->clearFocus();
        gallery_->setFocus(Qt::OtherFocusReason);
        return true;
    }
    if (gallery_ && watched == gallery_->viewport() && event->type() == QEvent::MouseButtonPress) {
        auto* mouse = static_cast<QMouseEvent*>(event);
        if (mouse->button() == Qt::LeftButton) {
            auto* item = gallery_->itemAt(mouse->pos());
            if (item) {
                const QRect card = galleryCardRect(gallery_, gallery_->visualItemRect(item));
                const QRect heart(card.right() - 37, card.top() + 7, 31, 31);
                if (heart.contains(mouse->pos())) {
                    const QString id = item->data(Qt::UserRole).toString();
                    if (favoriteModes_.contains(id)) favoriteModes_.remove(id);
                    else favoriteModes_.insert(id);
                    item->setData(Qt::UserRole + 2, favoriteModes_.contains(id));
                    gallery_->viewport()->update(gallery_->visualItemRect(item));
                    filterGallery();
                    savePreferences();
                    return true;
                }
            }
        }
    }
    return QWidget::eventFilter(watched, event);
}

void PixelStudioPanel::createShuffleControls(QSettings& settings, QHBoxLayout* filterRow) {
    randomPlayback_ = new StudioCheckBox(text("随机播放"), this);
    randomPlayback_->setFixedHeight(search_->sizeHint().height());
    randomPlayback_->setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
    randomTimer_ = new QTimer(this);
    randomDuration_ = new StudioSpinBox(this);
    randomDuration_->setRange(3, 3600);
    randomDuration_->setSuffix(QStringLiteral(" 秒"));
    randomDuration_->setValue(settings.value(QStringLiteral("randomDuration"), 20).toInt());
    randomDuration_->setFixedSize(72, search_->sizeHint().height());
    randomDuration_->setAlignment(Qt::AlignCenter);
    randomTimer_->setInterval(randomDuration_->value() * 1000);
    auto* randomControls = new QWidget(this);
    auto* randomLayout = new QHBoxLayout(randomControls);
    randomLayout->setContentsMargins(0, 0, 0, 0);
    randomLayout->setSpacing(0);
    randomLayout->addWidget(randomPlayback_, 0, Qt::AlignVCenter);
    randomLayout->addWidget(randomDuration_, 0, Qt::AlignVCenter);
    filterRow->insertWidget(filterRow->indexOf(search_) + 1, randomControls, 0, Qt::AlignVCenter);
    connect(randomTimer_, &QTimer::timeout, this, &PixelStudioPanel::advanceRandomAnimation);
    connect(randomPlayback_, &QCheckBox::toggled, this, [this] { updateControls(); });
    connect(randomDuration_, qOverload<int>(&QSpinBox::valueChanged), this, [this](int seconds) {
        randomTimer_->setInterval(seconds * 1000);
        if (randomTimer_->isActive()) randomTimer_->start();
        savePreferences();
    });
}
