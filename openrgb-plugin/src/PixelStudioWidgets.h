#pragma once
#include "PixelStudioTranslations.h"
#include <QStyleOptionFrame>
#include <QAbstractSpinBox>
#include <QApplication>
#include <QLocale>
#include <QScrollBar>
#include <QStyledItemDelegate>
#include <QStylePainter>
#include <QStyleOptionButton>
#include <QStyleOptionComboBox>
#include <QTabWidget>
#include <QCheckBox>
#include <QComboBox>
#include <QDoubleSpinBox>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QMouseEvent>
#include <QListWidget>
#include <QPainter>
#include <QPainterPath>
#include <QPixmap>
#include <QPolygonF>
#include <QPushButton>
#include <QSpinBox>
#include <QTextLayout>
#include <QTimer>
#include <QResizeEvent>
#include <QShowEvent>
#include <QtMath>

// Private UI implementation. Geometry and painting are deliberately unchanged.
namespace PixelStudioUi {
inline bool usesLatinBaseline(const QString& value) {
    for (const QChar character : value)
        if (character.unicode() > 0x7f) return false;
    return true;
}
inline void drawCenteredInk(QPainter& painter, const QRect& area, const QString& value, bool centered) {
    const QString label = painter.fontMetrics().elidedText(value, Qt::ElideRight, area.width());
    // Measure and paint the same glyph outlines. Mixing font-metric bounds
    // with native text rasterization can clip fallback-font strokes at high DPI.
    QPainterPath glyphs;
    glyphs.addText(QPointF(0, 0), painter.font(), label);
    const QRectF ink = glyphs.boundingRect();
    QPainterPath reference;
    reference.addText(QPointF(0, 0), painter.font(),
        usesLatinBaseline(value) ? QStringLiteral("H") : QStringLiteral("国"));
    const QRectF verticalInk = reference.boundingRect();
    const QRectF bounds(area);
    qreal x = centered ? bounds.center().x() - ink.center().x() : bounds.left() - ink.left();
    qreal y = bounds.center().y() - verticalInk.center().y();
    // Keep real glyph extents inside the control without content-dependent
    // baseline changes in the normal case. Reserve one logical pixel for AA.
    const QRectF safe = bounds.adjusted(1, 1, -1, -1);
    if (ink.width() <= safe.width())
        x = qBound(safe.left() - ink.left(), x, safe.right() - ink.right());
    if (ink.height() <= safe.height())
        y = qBound(safe.top() - ink.top(), y, safe.bottom() - ink.bottom());
    painter.save();
    painter.setClipRect(area, Qt::IntersectClip);
    painter.setRenderHint(QPainter::Antialiasing);
    painter.translate(x, y);
    painter.fillPath(glyphs, painter.pen().brush());
    painter.restore();
}
class StudioLabel final : public QLabel {
public:
    using QLabel::QLabel;
protected:
    void paintEvent(QPaintEvent* event) override {
        if (wordWrap() || text().isEmpty()) { QLabel::paintEvent(event); return; }
        QPainter painter(this);
        painter.setFont(font());
        painter.setPen(palette().color(isEnabled() ? QPalette::Active : QPalette::Disabled, foregroundRole()));
        drawCenteredInk(painter, contentsRect(), text(), alignment().testFlag(Qt::AlignHCenter));
    }
};
class StudioGlyphLabel final : public QLabel {
public:
    using QLabel::QLabel;
protected:
    void paintEvent(QPaintEvent*) override {
        if (text().isEmpty()) return;
        QPainterPath glyphs;
        glyphs.addText(QPointF(0, 0), font(), text());
        const QRectF ink = glyphs.boundingRect();
        QPainterPath baselineReference;
        baselineReference.addText(QPointF(0, 0), font(), QStringLiteral("H"));
        const QRectF verticalInk = usesLatinBaseline(text()) ? baselineReference.boundingRect() : ink;
        QPainter painter(this);
        painter.setRenderHint(QPainter::Antialiasing);
        painter.translate(contentsRect().left() - ink.left(), contentsRect().center().y() - verticalInk.center().y());
        painter.fillPath(glyphs, palette().color(isEnabled() ? QPalette::Active : QPalette::Disabled, foregroundRole()));
    }
};
class StudioCheckBox final : public QCheckBox {
public:
    using QCheckBox::QCheckBox;
protected:
    void paintEvent(QPaintEvent*) override {
        QStylePainter painter(this);
        QStyleOptionButton option;
        initStyleOption(&option);
        const QString label = option.text;
        option.text.clear();
        painter.drawControl(QStyle::CE_CheckBox, option);
        painter.setFont(font());
        painter.setPen(palette().color(isEnabled() ? QPalette::Active : QPalette::Disabled, QPalette::WindowText));
        QRect area = style()->subElementRect(QStyle::SE_CheckBoxContents, &option, this);
        const QRect indicator = style()->subElementRect(QStyle::SE_CheckBoxIndicator, &option, this);
        area.moveCenter(QPoint(area.center().x(), indicator.center().y()));
        drawCenteredInk(painter, area, label, false);
    }
};
inline void centerEditorInk(QLineEdit* edit) {
    const QFontMetrics metrics(edit->font());
    const QString sample = edit->text().isEmpty() || usesLatinBaseline(edit->text())
        ? QStringLiteral("H") : edit->text();
    const QRect ink = metrics.tightBoundingRect(sample);
    const int shift = qRound(-ink.center().y() - (metrics.ascent() - metrics.descent()) / 2.0);
    edit->setTextMargins(0, qMax(0, 2 * shift), 0, qMax(0, -2 * shift));
}
class StudioLineEdit final : public QLineEdit {
public:
    using QLineEdit::QLineEdit;
protected:
    void paintEvent(QPaintEvent* event) override {
        if (hasFocus() || hasSelectedText()) { QLineEdit::paintEvent(event); return; }
        QPainter painter(this);
        if (hasFrame()) {
            QStyleOptionFrame option;
            initStyleOption(&option);
            style()->drawPrimitive(QStyle::PE_PanelLineEdit, &option, &painter, this);
        }
        painter.setFont(font());
        QColor color = palette().color(isEnabled() ? QPalette::Active : QPalette::Disabled, QPalette::Text);
        if (text().isEmpty()) color.setAlphaF(0.55);
        painter.setPen(color);
        QRect area = contentsRect().adjusted(hasFrame() ? 6 : 1, 0, hasFrame() ? -6 : -1, 0);
        if (auto* spin = qobject_cast<QAbstractSpinBox*>(parentWidget()))
            area.moveCenter(QPoint(area.center().x(), spin->rect().center().y() - y()));
        drawCenteredInk(painter, area, text().isEmpty() ? placeholderText() : displayText(), alignment().testFlag(Qt::AlignHCenter));
    }
};
class StudioSpinBox final : public QSpinBox {
public:
    explicit StudioSpinBox(QWidget* parent = nullptr) : QSpinBox(parent) { setLineEdit(new StudioLineEdit(this)); }
};
class StudioDoubleSpinBox final : public QDoubleSpinBox {
public:
    explicit StudioDoubleSpinBox(QWidget* parent = nullptr) : QDoubleSpinBox(parent) { setLineEdit(new StudioLineEdit(this)); }
};
class SettingsButton final : public QPushButton {
public:
    using QPushButton::QPushButton;
protected:
    void paintEvent(QPaintEvent*) override {
        QStylePainter painter(this);
        QStyleOptionButton option;
        initStyleOption(&option);
        option.text.clear();
        painter.drawControl(QStyle::CE_PushButton, option);
        painter.setRenderHint(QPainter::Antialiasing);
        painter.translate(QRectF(rect()).center());
        painter.setPen(Qt::NoPen);
        painter.setBrush(palette().color(QPalette::ButtonText));
        QPainterPath ring;
        ring.setFillRule(Qt::OddEvenFill);
        ring.addEllipse(QPointF(0, 0), 8, 8);
        ring.addEllipse(QPointF(0, 0), 3.2, 3.2);
        painter.drawPath(ring);
        for (int tooth = 0; tooth < 8; ++tooth) {
            painter.drawRoundedRect(QRectF(-2, -10, 4, 4), 0.7, 0.7);
            painter.rotate(45);
        }
    }
};
class StudioButton final : public QPushButton {
public:
    using QPushButton::QPushButton;
protected:
    void paintEvent(QPaintEvent* event) override {
        if (text().isEmpty() || !icon().isNull()) { QPushButton::paintEvent(event); return; }
        QStylePainter painter(this);
        QStyleOptionButton option;
        initStyleOption(&option);
        const QString label = option.text;
        option.text.clear();
        painter.drawControl(QStyle::CE_PushButton, option);
        painter.setFont(font());
        painter.setPen(option.palette.color(isEnabled() ? QPalette::Active : QPalette::Disabled, QPalette::ButtonText));
        QRect area = style()->subElementRect(QStyle::SE_PushButtonContents, &option, this);
        area.setTop(0); area.setBottom(height() - 1);
        drawCenteredInk(painter, area, label, true);
    }
};
class PlaybackButton final : public QPushButton {
public:
    PlaybackButton(bool stop, QWidget* parent) : QPushButton(parent), stop_(stop) {}
protected:
    void paintEvent(QPaintEvent*) override {
        QStylePainter painter(this);
        QStyleOptionButton option;
        initStyleOption(&option);
        option.icon = QIcon();
        option.text.clear();
        painter.drawControl(QStyle::CE_PushButton, option);
        painter.setRenderHint(QPainter::Antialiasing);
        painter.setPen(Qt::NoPen);
        painter.setBrush(QColor(stop_ ? "#ffffff" : "#102319"));
        const QPointF center(width() / 2.0, height() / 2.0);
        if (stop_) painter.drawRoundedRect(QRectF(center.x() - 7, center.y() - 7, 14, 14), 1, 1);
        else {
            QPolygonF triangle;
            triangle << QPointF(center.x() - 5, center.y() - 9)
                     << QPointF(center.x() + 9, center.y())
                     << QPointF(center.x() - 5, center.y() + 9);
            painter.drawPolygon(triangle);
        }
    }
private:
    bool stop_;
};
class StudioCombo final : public QComboBox {
public:
    using QComboBox::QComboBox;
    QSize sizeHint() const override {
        QStyleOptionComboBox option;
        initStyleOption(&option);
        int textWidth = 0;
        bool hasIcon = false;
        for (int i = 0; i < count(); ++i) {
            textWidth = qMax(textWidth, fontMetrics().horizontalAdvance(itemText(i)));
            hasIcon = hasIcon || !itemIcon(i).isNull();
        }
        if (hasIcon) textWidth += iconSize().width() + 4;
        const QSize contents(textWidth + 4, fontMetrics().height());
        const QSize measured = style()->sizeFromContents(QStyle::CT_ComboBox, &option, contents, this);
        return QSize(measured.width(), QComboBox::sizeHint().height());
    }
    QSize minimumSizeHint() const override {
        return sizeHint();
    }
protected:
    void paintEvent(QPaintEvent*) override {
        QStylePainter painter(this);
        QStyleOptionComboBox option;
        initStyleOption(&option);
        const QString label = option.currentText;
        option.currentText.clear();
        painter.drawComplexControl(QStyle::CC_ComboBox, option);
        painter.setFont(font());
        painter.setPen(option.palette.color(isEnabled() ? QPalette::Active : QPalette::Disabled, QPalette::ButtonText));
        const bool centered = objectName() == QStringLiteral("PixelStudioLanguage");
        QRect area = centered ? rect().adjusted(22, 2, -22, -2)
            : style()->subControlRect(QStyle::CC_ComboBox, &option, QStyle::SC_ComboBoxEditField, this);
        area.setTop(0); area.setBottom(height() - 1);
        drawCenteredInk(painter, area, label, centered);
    }
};

inline QRect galleryCellRect(const QListWidget* gallery, const QRect& original) {
    if (!gallery || gallery->gridSize().width() <= 0) return original;
    const int width = gallery->viewport()->width();
    const int cellWidth = gallery->gridSize().width();
    // Qt 5 IconMode wraps against QRect::right(), not QRect::width().
    const int columns = qMax(1, qMax(1, width - 1) / cellWidth);
    const int column = qBound(0, original.left() / cellWidth, columns - 1);
    QRect cell = original;
    cell.setLeft(column * width / columns);
    cell.setRight((column + 1) * width / columns - 1);
    return cell;
}

inline QRect galleryCardRect(const QListWidget* gallery, const QRect& original) {
    const QRect cell = galleryCellRect(gallery, original);
    const bool firstColumn = cell.left() == 0;
    const bool lastColumn = gallery && cell.right() == gallery->viewport()->width() - 1;
    const bool firstRow = gallery && original.top() + gallery->verticalScrollBar()->value() <= 0;
    bool lastRow = false;
    if (gallery) {
        for (int i = gallery->count() - 1; i >= 0; --i) {
            const auto* item = gallery->item(i);
            if (!item->isHidden()) {
                lastRow = gallery->visualItemRect(item).top() == original.top();
                break;
            }
        }
    }
    // Adjacent insets add up to 7px. Edge cards retain the 5px inset,
    // plus the 1px frame and 1px viewport margin, for the same outer gap.
    return cell.adjusted(firstColumn ? 5 : 3, firstRow ? 5 : 3,
                         lastColumn ? -5 : -4, lastRow ? -5 : -4);
}

class AnimationGallery final : public QListWidget {
public:
    explicit AnimationGallery(QWidget* parent) : QListWidget(parent) {
        setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
        setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
        // 1px frame + 1px viewport inset + 5px card inset = 7px.
        setViewportMargins(1, 1, 1, 1);
        setMouseTracking(true);
        viewport()->setMouseTracking(true);
        viewport()->setAttribute(Qt::WA_Hover);
    }
    bool viewportEvent(QEvent* event) override {
        const bool handled = QListWidget::viewportEvent(event);
        if (event->type() == QEvent::MouseMove || event->type() == QEvent::Leave) {
            const QModelIndex hovered = event->type() == QEvent::MouseMove
                ? indexAt(static_cast<QMouseEvent*>(event)->pos()) : QModelIndex();
            if (hovered != hoveredIndex_) {
                hoveredIndex_ = hovered;
                // Distributed columns differ from Qt's original item rectangles.
                // Repaint both neighbors together when hover changes.
                viewport()->update();
            }
        }
        return handled;
    }
    void scheduleCardLayout() {
        if (cardLayoutPending_) return;
        cardLayoutPending_ = true;
        QTimer::singleShot(0, this, [this] {
            cardLayoutPending_ = false;
            fitCards();
        });
    }
    void fitCards() {
        const QSize viewportSize = viewport()->size();
        // QIconModeViewBase wraps when x + grid.width() > bounds.right().
        // Reserve that coordinate pixel in the grid calculation; painting
        // still distributes cells over the full viewport, without an extra gap.
        const int available = qMax(1, viewport()->width() - 1);
        const int columns = qMax(1, (available + 95) / 96);
        const int cellWidth = available / columns;
        const QSize cell(cellWidth, qRound(qMax(1, cellWidth - 7) * 27.0 / 15.0) + 7);
        if (lastLayoutViewport_ == viewportSize && gridSize() == cell) return;
        lastLayoutViewport_ = viewportSize;
        if (gridSize() != cell) setGridSize(cell);
        // Qt can retain positions calculated before the host tab, preview pane
        // and native controls settle, even when the rounded grid size is unchanged.
        doItemsLayout();
        viewport()->update();
    }
    void revealCurrentCard() {
        auto* item = currentItem();
        if (!item || item->isHidden()) return;
        scrollToItem(item, QAbstractItemView::EnsureVisible);
        const QRect card = galleryCardRect(this, visualItemRect(item));
        const int safeTop = 21;
        const int safeBottom = viewport()->height() - 21;
        auto* scroll = verticalScrollBar();
        if (card.height() > safeBottom - safeTop) {
            scrollToItem(item, QAbstractItemView::PositionAtCenter);
        } else if (card.top() < safeTop) {
            scroll->setValue(scroll->value() + card.top() - safeTop);
        } else if (card.bottom() >= safeBottom) {
            scroll->setValue(scroll->value() + card.bottom() - safeBottom + 1);
        }
        viewport()->update();
    }
protected:
    void resizeEvent(QResizeEvent* event) override {
        QListWidget::resizeEvent(event);
        // Set the final grid before a resize paint can use the old positions.
        fitCards();
    }
    void showEvent(QShowEvent* event) override {
        QListWidget::showEvent(event);
        fitCards();
    }
    void paintEvent(QPaintEvent* event) override {
        QListWidget::paintEvent(event);
        const auto* scroll = verticalScrollBar();
        const QRect area = viewport()->rect();
        const int fadeHeight = qMin(16, area.height() / 2);
        const QVariant theme = property("studioBackground");
        const QColor background = theme.isValid() ? theme.value<QColor>() : QColor("#0b1510");
        QColor clear = background;
        clear.setAlpha(0);
        QPainter painter(viewport());
        painter.setRenderHint(QPainter::Antialiasing);
        QPainterPath well;
        well.addRoundedRect(QRectF(area), 7, 7);
        for (bool top : {true, false}) {
            const bool hidden = top ? scroll->value() > scroll->minimum()
                                    : scroll->value() < scroll->maximum();
            if (!hidden || fadeHeight <= 0) continue;
            const int y = top ? 0 : area.height() - fadeHeight;
            QLinearGradient fade(0, y, 0, y + fadeHeight);
            fade.setColorAt(0, top ? background : clear);
            fade.setColorAt(1, top ? clear : background);
            painter.save();
            painter.setClipRect(QRect(0, y, area.width(), fadeHeight));
            painter.fillPath(well, fade);
            painter.restore();
        }
        // Paint selection above neighboring cells, without clipping its outer ring.
        if (const auto* item = currentItem(); item && item->isSelected() && !item->isHidden()) {
            const QRect card = galleryCardRect(this, visualItemRect(item));
            const QVariant accent = property("studioAccent");
            painter.setClipPath(well, Qt::IntersectClip);
            painter.setPen(QPen(accent.isValid() ? accent.value<QColor>() : QColor("#8ee6ba"), 2));
            painter.setBrush(Qt::NoBrush);
            painter.drawRoundedRect(QRectF(card).adjusted(-4, -4, 4, 4), 6, 6);
        }
    }
private:
    QModelIndex hoveredIndex_;
    bool cardLayoutPending_ = false;
    QSize lastLayoutViewport_;
};

class PreviewWorkspaceLayout final : public QHBoxLayout {
public:
    explicit PreviewWorkspaceLayout(QWidget* parent) : QHBoxLayout(parent) {}
    QWidget* preview = nullptr;
    QWidget* board = nullptr;
    QWidget* boardSlot = nullptr;
    QWidget* viewport = nullptr;
    QWidget* library = nullptr;
    QSize minimumSize() const override {
        const QSize base = QHBoxLayout::minimumSize();
        return QSize(base.width(), 0);
    }
    void setGeometry(const QRect& rect) override {
        if (preview && board) {
            const double columns = board->property("matrixColumns").toInt();
            const double rows = board->property("matrixRows").toInt();
            const double ratio = (columns + 0.8 / 7.125) / (rows + 0.8 / 7.125);
            const QMargins margins = contentsMargins();
            const int verticalMargin = margins.top() + margins.bottom();
            const int availableHeight = qMax(0, (viewport ? qMin(rect.height(), viewport->height()) : rect.height()) - verticalMargin);
            const int maximumPaneWidth = qMax(64, rect.width() - margins.left() - margins.right() - 180);
            // The canvas extends 6px on each side. Its 9.5px halo allowance
            // minus the 3.5px bright rim leaves the visible rim on the slot edge.
            // Calculate once, instead of changing margins during layout passes.
            const int paneWidth = qBound(64, qFloor(qMax(0, availableHeight - 7) * ratio) + 15, maximumPaneWidth);
            const int screenHeight = qCeil((paneWidth - 15) / ratio) + 7;
            if (preview->minimumWidth() != paneWidth || preview->maximumWidth() != paneWidth)
                preview->setFixedWidth(paneWidth);
            if (boardSlot && (boardSlot->minimumHeight() != screenHeight || boardSlot->maximumHeight() != screenHeight))
                boardSlot->setFixedHeight(screenHeight);
            if (library && (library->minimumHeight() != screenHeight || library->maximumHeight() != screenHeight))
                library->setFixedHeight(screenHeight);
        }
        QHBoxLayout::setGeometry(rect);
        if (preview && board && boardSlot) {
            // The slot measures the bright rim. The real canvas is a sibling
            // of the preview pane, so its halo can use the workspace margin.
            preview->layout()->setGeometry(preview->rect());
            const QPoint origin = boardSlot->mapTo(board->parentWidget(), QPoint(0, 0));
            const QRect boardGeometry = QRect(origin, boardSlot->size()).adjusted(-6, -6, 6, 6);
            if (board->geometry() != boardGeometry) board->setGeometry(boardGeometry);
            board->raise();
        }
    }
};

inline bool hostInterfaceUsesChinese(const QWidget* panel) {
    // Inspect the host tabs, not the plugin's translated children. The host's
    // language-name string is not translated by every OpenRGB release.
    for (auto* widget : QApplication::allWidgets()) {
        auto* tabs = qobject_cast<QTabWidget*>(widget);
        if (!tabs || !tabs->isAncestorOf(panel)) continue;
        for (int i = 0; i < tabs->count(); ++i) {
            if (tabs->widget(i) == panel || tabs->widget(i)->isAncestorOf(panel)) continue;
            QString label = tabs->tabText(i);
            label.remove(QLatin1Char('&'));
            if (label == QString::fromUtf8("设备") || label == QString::fromUtf8("設備")
                || label == QString::fromUtf8("设置") || label == QString::fromUtf8("設定")) return true;
            if (label.compare(QStringLiteral("Devices"), Qt::CaseInsensitive) == 0
                || label.compare(QStringLiteral("Settings"), Qt::CaseInsensitive) == 0) return false;
        }
    }
    if (PixelStudioI18n::hostUsesChinese()) return true;
    return QLocale::system().language() == QLocale::Chinese;
}

class AnimationCardDelegate final : public QStyledItemDelegate {
public:
    explicit AnimationCardDelegate(QObject* parent) : QStyledItemDelegate(parent) {}
    QSize sizeHint(const QStyleOptionViewItem& option, const QModelIndex&) const override {
        const auto* gallery = qobject_cast<QListWidget*>(parent());
        Q_UNUSED(option);
        return gallery && gallery->gridSize().isValid() ? gallery->gridSize() : QSize(112, 195);
    }
    void paint(QPainter* painter, const QStyleOptionViewItem& option,
               const QModelIndex& index) const override {
        painter->save();
        painter->setRenderHint(QPainter::Antialiasing);
        const auto* gallery = qobject_cast<QListWidget*>(parent());
        const QRect cell = galleryCellRect(gallery, option.rect);
        painter->setClipRect(cell, Qt::IntersectClip);
        if (gallery) {
            QPainterPath well;
            well.addRoundedRect(QRectF(gallery->viewport()->rect()), 7, 7);
            painter->setClipPath(well, Qt::IntersectClip);
        }
        const QRect card = galleryCardRect(gallery, option.rect);
        const bool selected = option.state & QStyle::State_Selected;
        const auto themeColor = [gallery](const char* name, const char* fallback) {
            const QVariant value = gallery ? gallery->property(name) : QVariant();
            return value.isValid() ? value.value<QColor>() : QColor(fallback);
        };
        const QColor accent = themeColor("studioAccent", "#8ee6ba");
        painter->save();
        QPainterPath cardClip;
        cardClip.addRoundedRect(QRectF(card), 2, 2);
        painter->setClipPath(cardClip, Qt::IntersectClip);
        painter->fillRect(card, themeColor("studioBackground", "#0b1510"));
        const QIcon icon = qvariant_cast<QIcon>(index.data(Qt::DecorationRole));
        const QPixmap pixels = icon.pixmap(QSize(45, 81), QIcon::Normal, QIcon::Off);
        painter->setRenderHint(QPainter::SmoothPixmapTransform, false);
        painter->drawPixmap(card, pixels, pixels.rect());
        const bool showCaption = (option.state & (QStyle::State_MouseOver | QStyle::State_HasFocus))
            || (gallery && gallery->property("studioSearching").toBool());
        if (showCaption) {
            painter->setFont(option.font);
            const QString title = index.data(Qt::DisplayRole).toString();
            const int textWidth = qMax(1, card.width() - 14);
            const int textHeight = option.fontMetrics.boundingRect(
                QRect(0, 0, textWidth, 1000), Qt::AlignHCenter | Qt::TextWordWrap, title).height();
            const int captionHeight = qMin(card.height(), textHeight + 20);
            const QRect caption(card.left(), card.bottom() - captionHeight + 1, card.width(), captionHeight);
            QColor glass = accent;
            glass.setAlpha(191);
            painter->fillRect(caption, glass);
            const QRect textRect = caption.adjusted(7, 0, -7, 0);
            painter->setPen(QColor(Qt::white));
            // Center visible glyphs, not the font's ascent/descent line box.
            QTextLayout titleLayout(title, option.font);
            QTextOption textOption;
            textOption.setWrapMode(QTextOption::WrapAtWordBoundaryOrAnywhere);
            titleLayout.setTextOption(textOption);
            QPainterPath titleInk;
            qreal baseline = 0;
            titleLayout.beginLayout();
            while (true) {
                QTextLine line = titleLayout.createLine();
                if (!line.isValid()) break;
                line.setLineWidth(textRect.width());
                QPainterPath lineInk;
                lineInk.addText(QPointF(0, baseline + line.ascent()), option.font,
                    title.mid(line.textStart(), line.textLength()));
                lineInk.translate(textRect.width() / 2.0 - lineInk.boundingRect().center().x(), 0);
                titleInk.addPath(lineInk);
                baseline += line.height();
            }
            titleLayout.endLayout();
            const QRectF inkBounds = titleInk.boundingRect();
            titleInk.translate(QRectF(textRect).center() - inkBounds.center());
            painter->fillPath(titleInk, painter->pen().brush());
        }
        painter->save();
        painter->translate(card.right() - 21.5, card.top() + 22.5);
        painter->setPen(Qt::NoPen);
        QColor heartBackground = accent;
        heartBackground.setAlpha(41);
        painter->setBrush(heartBackground);
        painter->drawEllipse(QPointF(0, 0), 15.5, 15.5);
        QPainterPath heart;
        heart.moveTo(0, 7);
        heart.cubicTo(-11, 0, -8, -8, 0, -3);
        heart.cubicTo(8, -8, 11, 0, 0, 7);
        const bool favorite = index.data(Qt::UserRole + 2).toBool();
        painter->setPen(QPen(favorite ? QColor("#ff91a6") : accent, 1.5));
        painter->setBrush(favorite ? QColor("#ff718f") : Qt::NoBrush);
        painter->drawPath(heart);
        painter->restore();
        painter->restore(); // The outer selection ring must not use the card clip.
        QColor outline = selected ? accent : themeColor("studioBorder", "#304b3b");
        painter->setPen(QPen(outline, 1));
        painter->setBrush(Qt::NoBrush);
        painter->drawRoundedRect(QRectF(card).adjusted(.5, .5, -.5, -.5), 2, 2);
        painter->restore();
    }
};

inline QIcon playbackIcon(bool stop) {
    QPixmap pixmap(40, 40);
    pixmap.setDevicePixelRatio(2.0);
    pixmap.fill(Qt::transparent);
    {
        QPainter painter(&pixmap);
        painter.setRenderHint(QPainter::Antialiasing);
        painter.setPen(Qt::NoPen);
        painter.setBrush(stop ? QColor("#ffffff") : QColor("#102319"));
        if (stop) {
            painter.drawRoundedRect(QRectF(4, 4, 12, 12), 1, 1);
        } else {
            QPolygonF triangle;
            triangle << QPointF(6, 3) << QPointF(17, 10) << QPointF(6, 17);
            painter.drawPolygon(triangle);
        }
    }
    QIcon icon;
    for (const auto mode : {QIcon::Normal, QIcon::Disabled, QIcon::Active, QIcon::Selected})
        icon.addPixmap(pixmap, mode);
    return icon;
}
}
