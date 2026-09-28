#include <QStyleOptionFrame>
#include <QMessageBox>
#include <QRandomGenerator>
#include "PixelStudioPanel.h"
#include "PixelStudioUpdates.h"
#include "PixelStudioTranslations.h"
#include "PixelStudioLogo.h"
#include <QColorDialog>
#include <QDialogButtonBox>
#include <QRegularExpression>

#include <QAbstractButton>
#include <QApplication>
#include <QLocale>
#include <QScrollArea>
#include <QScrollBar>
#include <QScreen>
#include <QStyledItemDelegate>
#include <QStylePainter>
#include <QStyleOptionButton>
#include <QStyleOptionComboBox>
#include <QTabWidget>
#include <QCheckBox>
#include <QComboBox>
#include <QDesktopServices>
#include <QDialog>
#include <QDir>
#include <QDoubleSpinBox>
#include <QEvent>
#include <QFileDialog>
#include <QFileInfo>
#include <QFont>
#include <QFormLayout>
#include <QGridLayout>
#include <QGroupBox>
#include <QHBoxLayout>
#include <QIcon>
#include <QImage>
#include <QInputDialog>
#include <QJsonArray>
#include <QJsonDocument>
#include <QLabel>
#include <QLineEdit>
#include <QMouseEvent>
#include <QListWidget>
#include <QPainter>
#include <QPainterPath>
#include <QPaintEvent>
#include <QShowEvent>
#include <QHideEvent>
#include <QtMath>
#include <QPixmap>
#include <QPolygonF>
#include <QProcess>
#include <QPushButton>
#include <QSlider>
#include <QSettings>
#include <QSignalBlocker>
#include <QSizePolicy>
#include <QSpinBox>
#include <QStandardPaths>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>

namespace {
bool usesLatinBaseline(const QString& value) {
    for (const QChar character : value)
        if (character.unicode() > 0x7f) return false;
    return true;
}
void drawCenteredInk(QPainter& painter, const QRect& area, const QString& value, bool centered) {
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
void centerEditorInk(QLineEdit* edit) {
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

class AnimationGallery final : public QListWidget {
public:
    explicit AnimationGallery(QWidget* parent) : QListWidget(parent) {
        setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
        setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
        setViewportMargins(4, 4, 4, 4);
    }
    void fitCards() {
        const int available = qMax(1, viewport()->width());
        const int columns = qMax(1, available / 112);
        const QSize cell(available / columns, 105 + 2 * fontMetrics().lineSpacing());
        if (gridSize() != cell) setGridSize(cell);
    }
protected:
    bool viewportEvent(QEvent* event) override {
        const bool result = QListWidget::viewportEvent(event);
        if (event->type() == QEvent::Resize) fitCards();
        return result;
    }
};

class PreviewWorkspaceLayout final : public QHBoxLayout {
public:
    explicit PreviewWorkspaceLayout(QWidget* parent) : QHBoxLayout(parent) {}
    QWidget* preview = nullptr;
    QWidget* board = nullptr;
    QWidget* boardSlot = nullptr;
    QWidget* viewport = nullptr;
    QSize minimumSize() const override {
        const QSize base = QHBoxLayout::minimumSize();
        return QSize(base.width(), 0);
    }
    void setGeometry(const QRect& rect) override {
        if (preview && board) {
            const double columns = board->property("matrixColumns").toInt();
            const double rows = board->property("matrixRows").toInt();
            const double ratio = (columns + 0.8 / 7.125) / (rows + 0.8 / 7.125);
            auto* stack = preview->layout();
            const QMargins margins = contentsMargins();
            const int verticalMargin = margins.top() + margins.bottom();
            const int availableHeight = qMax(0, (viewport ? qMin(rect.height(), viewport->height() - 24) : rect.height()) - verticalMargin);
            const int maximumPaneWidth = qMax(64, rect.width() - margins.left() - margins.right() - 180);
            int paneWidth = qBound(64, preview->width(), maximumPaneWidth);
            // Account for wrapped notes and controls before sizing the screen.
            for (int pass = 0; pass < 4; ++pass) {
                int chrome = stack->contentsMargins().top() + stack->contentsMargins().bottom();
                int visible = 0;
                for (int i = 0; i < stack->count(); ++i) {
                    auto* item = stack->itemAt(i);
                    if (item->isEmpty()) continue;
                    ++visible;
                    if (item->widget() == boardSlot) continue;
                    chrome += item->hasHeightForWidth() ? item->heightForWidth(paneWidth - 8)
                                                       : item->sizeHint().height();
                }
                chrome += qMax(0, visible - 1) * stack->spacing();
                paneWidth = qBound(64, qFloor(qMax(0, availableHeight - chrome - 16) * ratio) + 24, maximumPaneWidth);
            }
            preview->setFixedWidth(paneWidth);
            if (boardSlot) boardSlot->setFixedHeight(qCeil((paneWidth - 24) / ratio) + 16);
        }
        QHBoxLayout::setGeometry(rect);
        if (preview && board && boardSlot) {
            // The slot measures the bright rim. The real canvas is a sibling
            // of the preview pane, so its halo can use the workspace margin.
            preview->layout()->setGeometry(preview->rect());
            const QPoint origin = boardSlot->mapTo(board->parentWidget(), QPoint(0, 0));
            board->setGeometry(QRect(origin, boardSlot->size()).adjusted(-6, -6, 6, 6));
            board->raise();
        }
    }
};

bool hostInterfaceUsesChinese(const QWidget* panel) {
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
        return QSize(gallery && gallery->gridSize().width() > 0 ? gallery->gridSize().width() : 132,
                     105 + 2 * option.fontMetrics.lineSpacing());
    }
    void paint(QPainter* painter, const QStyleOptionViewItem& option,
               const QModelIndex& index) const override {
        painter->save();
        painter->setClipRect(option.rect);
        painter->setRenderHint(QPainter::Antialiasing);
        const auto* gallery = qobject_cast<QListWidget*>(parent());
        const int cellWidth = gallery ? gallery->gridSize().width() : 0;
        const int remainder = cellWidth > 0 ? gallery->viewport()->width() % cellWidth : 0;
        const QRect card = option.rect.adjusted(4, 4, -4, -4).translated(remainder / 2, 0);
        const bool selected = option.state & QStyle::State_Selected;
        const auto themeColor = [gallery](const char* name, const char* fallback) {
            const QVariant value = gallery ? gallery->property(name) : QVariant();
            return value.isValid() ? value.value<QColor>() : QColor(fallback);
        };
        painter->setPen(QPen(selected ? themeColor("studioAccent", "#8ee6ba") : themeColor("studioBorder", "#304b3b"), 1));
        painter->setBrush(selected ? themeColor("studioSelected", "#284b3a") : themeColor("studioBackground", "#0b1510"));
        painter->drawRoundedRect(card, 6, 6);
        const QIcon icon = qvariant_cast<QIcon>(index.data(Qt::DecorationRole));
        icon.paint(painter, QRect(card.center().x() - 22, card.top() + 7, 45, 81));
        painter->save();
        painter->translate(card.right() - 16, card.top() + 16);
        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(0, 0, 0, 145));
        painter->drawEllipse(QPointF(0, 0), 12, 12);
        QPainterPath heart;
        heart.moveTo(0, 7);
        heart.cubicTo(-11, 0, -8, -8, 0, -3);
        heart.cubicTo(8, -8, 11, 0, 0, 7);
        const bool favorite = index.data(Qt::UserRole + 2).toBool();
        painter->setPen(QPen(favorite ? QColor("#ff91a6") : QColor("#f5f5f5"), 1.5));
        painter->setBrush(favorite ? QColor("#ff718f") : Qt::NoBrush);
        painter->drawPath(heart);
        painter->restore();
        painter->setFont(option.font);
        painter->setPen(QColor("#e1eee6"));
        const QRect caption(card.left() + 6, card.top() + 94, card.width() - 12,
                            2 * option.fontMetrics.lineSpacing());
        painter->setClipRect(caption, Qt::IntersectClip);
        painter->drawText(caption, Qt::AlignHCenter | Qt::AlignTop | Qt::TextWordWrap,
                          index.data(Qt::DisplayRole).toString());
        painter->restore();
    }
};

QIcon playbackIcon(bool stop) {
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
QString text(const char* value) { return QString::fromUtf8(value); }
QSettings preferences() {
    const QString directory = QDir(QStandardPaths::writableLocation(QStandardPaths::GenericConfigLocation))
        .filePath(QStringLiteral("Pixel Studio for OpenRGB"));
    const QString file = QDir(directory).filePath(QStringLiteral("OpenRGBPlugin.ini"));
    if (!QFileInfo::exists(file) && QDir().mkpath(directory)) {
        const QSettings legacy(QSettings::IniFormat, QSettings::UserScope,
                               QStringLiteral("PixelStudio"), QStringLiteral("OpenRGBPlugin"));
        if (QFileInfo::exists(legacy.fileName())) QFile::copy(legacy.fileName(), file);
    }
    return QSettings(file, QSettings::IniFormat);
}
QImage rgbImage(int width, int height, const QByteArray& rgb) {
    if (width < 1 || height < 1 || width > 128 || height > 128
        || width * height > 4096 || rgb.size() != width * height * 3) return {};
    QImage image(width, height, QImage::Format_RGB32);
    for (int y = 0; y < height; ++y) {
        auto* row = reinterpret_cast<QRgb*>(image.scanLine(y));
        for (int x = 0; x < width; ++x) {
            const int i = (y * width + x) * 3;
            row[x] = qRgb(static_cast<unsigned char>(rgb[i]),
                          static_cast<unsigned char>(rgb[i + 1]),
                          static_cast<unsigned char>(rgb[i + 2]));
        }
    }
    return image;
}
QString categoryForMode(const QString& id) {
    if (id.startsWith(QStringLiteral("hand_"))) return QStringLiteral("handmade");
    if (id == QStringLiteral("clock")) return QStringLiteral("info");
    static const QStringList nature = {
        QStringLiteral("fox"), QStringLiteral("capybara"), QStringLiteral("owl"),
        QStringLiteral("axolotl"), QStringLiteral("snail"), QStringLiteral("bees"),
        QStringLiteral("mushroom"), QStringLiteral("butterfly"), QStringLiteral("koi"),
        QStringLiteral("fish"), QStringLiteral("cat"), QStringLiteral("bamboo"),
        QStringLiteral("flower"), QStringLiteral("bloom"), QStringLiteral("greenhouse")
    };
    for (const auto& word : nature) if (id.contains(word)) return QStringLiteral("nature");
    static const QStringList ambience = {
        QStringLiteral("aurora"), QStringLiteral("meteor"), QStringLiteral("sunset"),
        QStringLiteral("lantern"), QStringLiteral("city"), QStringLiteral("mountain"),
        QStringLiteral("candle"), QStringLiteral("waterfall"), QStringLiteral("galaxy"),
        QStringLiteral("tunnel"), QStringLiteral("rain"), QStringLiteral("snow"),
        QStringLiteral("fire"), QStringLiteral("lava"), QStringLiteral("night"),
        QStringLiteral("sakura"), QStringLiteral("lighthouse"), QStringLiteral("circuit")
    };
    for (const auto& word : ambience) if (id.contains(word)) return QStringLiteral("ambience");
    return QStringLiteral("playful");
}
}

PixelBoard::PixelBoard(QWidget* parent) : QWidget(parent) {
    setMinimumSize(0, 0);
    setProperty("matrixColumns", columns_);
    setProperty("matrixRows", rows_);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Expanding);
    pixels_.fill('\0', columns_ * rows_ * 3);
    glowTimer_ = new QTimer(this);
    glowTimer_->setTimerType(Qt::PreciseTimer);
    glowTimer_->setInterval(8);
    connect(glowTimer_, &QTimer::timeout, this, [this] {
        if (isVisible() && !window()->isMinimized()) {
            if (glowRegion_.isEmpty()) update();
            else update(glowRegion_);
        }
    });
}
void PixelBoard::setFrame(int width, int height, const QByteArray& rgb) {
    if (width < 1 || height < 1 || width > 128 || height > 128
        || width * height > 4096 || rgb.size() != width * height * 3) return;
    const bool dimensionsChanged = columns_ != width || rows_ != height;
    columns_ = width;
    rows_ = height;
    if (dimensionsChanged) {
        glowCache_ = QImage();
        setProperty("matrixColumns", columns_);
        setProperty("matrixRows", rows_);
        if (parentWidget() && parentWidget()->parentWidget())
            parentWidget()->parentWidget()->layout()->invalidate();
        updateGeometry();
    }
    pixels_ = rgb;
    update();
}
void PixelBoard::setCadAppearance(bool enabled) {
    cad_ = enabled;
    glowCache_ = QImage();
    update();
}
void PixelBoard::setThemeColors(const QColor& accent, const QColor& idle) {
    accent_ = accent;
    idleBorder_ = idle;
    glowCache_ = QImage();
    update();
}
void PixelBoard::setPlaying(bool playing) {
    if (playing_ == playing) return;
    playing_ = playing;
    if (playing_) glowClock_.restart();
    syncGlowTimer();
    update();
}
void PixelBoard::syncGlowTimer() {
    const bool animate = playing_ && isVisible() && !window()->isMinimized();
    if (animate && !glowTimer_->isActive()) glowTimer_->start();
    else if (!animate) glowTimer_->stop();
}
void PixelBoard::showEvent(QShowEvent* event) {
    QWidget::showEvent(event);
    QWidget* host = window();
    if (observedWindow_.data() != host) {
        if (observedWindow_) observedWindow_->removeEventFilter(this);
        observedWindow_ = host;
        if (host != this) host->installEventFilter(this);
    }
    syncGlowTimer();
}
void PixelBoard::hideEvent(QHideEvent* event) {
    glowTimer_->stop();
    QWidget::hideEvent(event);
}
bool PixelBoard::eventFilter(QObject* watched, QEvent* event) {
    if (watched == observedWindow_.data()) {
        if (event->type() == QEvent::Hide || event->type() == QEvent::Close)
            glowTimer_->stop();
        else if (event->type() == QEvent::WindowStateChange || event->type() == QEvent::Show)
            syncGlowTimer();
    }
    return QWidget::eventFilter(watched, event);
}
void PixelBoard::paintEvent(QPaintEvent* event) {
    QPainter painter(this);
    // Leave unused layout space transparent instead of painting a wide dark box.
    // The visible screen fits its matrix aspect ratio at every window size.
    const double gapRatio = cad_ ? 0.8 / 7.125 : 0.0;
    // The canvas extends 6px outside its layout slot. A 3.5px bright-rim
    // outset plus that extension keeps the rim aligned with the slot while
    // leaving room for the full 8px halo and antialiasing.
    // Use the same bounds when idle so playback never changes the pixel size.
    const double haloOutset = 9.5;
    const double pitch = qMax(0.1, qMin((width() - 2.0 * haloOutset) / (columns_ + gapRatio),
                                       (height() - 2.0 * haloOutset) / (rows_ + gapRatio)));
    const double x0 = (width() - columns_ * pitch) / 2.0;
    const double y0 = (height() - rows_ * pitch) / 2.0;
    const double inset = pitch * gapRatio / 2.0;
    // From the outside edge to the first pixel is 2 * inset, exactly the
    // same width as the gap between adjacent pixel apertures.
    const QRectF screen(x0 - inset, y0 - inset,
                        columns_ * pitch + 2 * inset, rows_ * pitch + 2 * inset);
    const double screenRadius = cad_ ? pitch * (0.8 / 7.125) + 2 * inset : 0.0;
    // Only the outer strips need a repaint for the breathing animation.
    const int innerMargin = qCeil(screenRadius) + 1;
    glowRegion_ = QRegion(rect()).subtracted(QRegion(screen.adjusted(innerMargin, innerMargin, -innerMargin, -innerMargin).toAlignedRect()));
    if (playing_) {
        const qreal dpr = devicePixelRatioF();
        const QSize physical(qCeil(width() * dpr), qCeil(height() * dpr));
        if (glowCache_.size() != physical || glowCache_.devicePixelRatio() != dpr) {
            glowCache_ = QImage(physical, QImage::Format_ARGB32_Premultiplied);
            glowCache_.setDevicePixelRatio(dpr);
            glowCache_.fill(Qt::transparent);
            QPainter glow(&glowCache_);
            glow.setRenderHint(QPainter::Antialiasing);
            glow.setBrush(Qt::NoBrush);
            const QRectF bezel = screen.adjusted(-2, -2, 2, 2);
            for (int stroke = 10; stroke >= 1; --stroke) {
                QColor halo = accent_;
                halo.setAlpha(stroke == 1 ? 200 : 15);
                glow.setPen(QPen(halo, stroke + 2));
                glow.drawRoundedRect(bezel, screenRadius + 2, screenRadius + 2);
            }
        }
        const double breath = 0.72 + 0.28 * qCos(glowClock_.elapsed() * 6.283185307179586 / 3800.0);
        painter.save();
        painter.setOpacity(breath);
        painter.drawImage(QPoint(0, 0), glowCache_);
        painter.restore();
    } else {
        // Keep the same bezel geometry while idle, without an active halo.
        painter.save();
        painter.setRenderHint(QPainter::Antialiasing);
        painter.setBrush(Qt::NoBrush);
        painter.setPen(QPen(idleBorder_, 3));
        painter.drawRoundedRect(screen.adjusted(-2, -2, 2, 2), screenRadius + 2, screenRadius + 2);
        painter.restore();
    }
    painter.setRenderHint(QPainter::Antialiasing, cad_);
    QPainterPath screenShape;
    screenShape.addRoundedRect(screen, screenRadius, screenRadius);
    painter.fillPath(screenShape, QColor("#000000"));
    painter.setPen(Qt::NoPen);
    painter.setRenderHint(QPainter::Antialiasing, cad_);
    // Front aperture measured from the user's CAD: pitch 7.125, opening 6.325, R0.8.
    const double radius = pitch * (0.8 / 7.125);
    for (int y = 0; y < rows_; ++y) {
        for (int x = 0; x < columns_; ++x) {
            const int i = (y * columns_ + x) * 3;
            const QRectF cell(x0 + x * pitch + inset, y0 + y * pitch + inset,
                              pitch - 2 * inset, pitch - 2 * inset);
            if (!event->region().intersects(cell.toAlignedRect())) continue;
            painter.setBrush(QColor(static_cast<unsigned char>(pixels_[i]),
                                    static_cast<unsigned char>(pixels_[i + 1]),
                                    static_cast<unsigned char>(pixels_[i + 2])));
            if (cad_) painter.drawRoundedRect(cell, radius, radius);
            else painter.drawRect(cell);
        }
    }
}

PixelStudioPanel::PixelStudioPanel(bool darkTheme, QWidget* parent) : QWidget(parent) {
    setObjectName(QStringLiteral("PixelStudioPanel"));
    // Logical pixels: Windows applies the user's display scaling separately.
    setMinimumWidth(980);
    QFont interfaceFont;
    interfaceFont.setFamilies(QStringList{QStringLiteral("Segoe UI"), QStringLiteral("Microsoft YaHei UI"), QStringLiteral("Microsoft YaHei")});
    interfaceFont.setPointSize(10);
    interfaceFont.setStyleHint(QFont::SansSerif);
    setFont(interfaceFont);
    auto settings = preferences();
    for (const auto& id : settings.value(QStringLiteral("favorites")).toStringList()) favoriteModes_.insert(id);
    auto* shell = new QVBoxLayout(this);
    shell->setContentsMargins(0, 0, 0, 0);
    auto* scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setMinimumSize(0, 0);
    scroll->setMinimumHeight(120);
    scroll->setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    auto* content = new QWidget(scroll);
    auto* outer = new QVBoxLayout(content);
    outer->setSizeConstraint(QLayout::SetMinimumSize);
    scroll->setWidget(content);
    shell->setContentsMargins(12, 8, 12, 8);
    shell->setSpacing(6);
    shell->addWidget(scroll, 1);
    outer->setContentsMargins(16, 12, 16, 12);
    outer->setSpacing(10);
    auto* title = new StudioLabel(QStringLiteral("PIXEL STUDIO"), this);
    title->setObjectName(QStringLiteral("PixelStudioTitle"));
    auto titleFont = title->font();
    titleFont.setPointSize(titleFont.pointSize() + 6);
    titleFont.setBold(true);
    title->setFont(titleFont);
    auto* heading = new QHBoxLayout;
    // Same eight-pixel mark as the web header, drawn natively for crisp DPI scaling.
    auto* brandMark = new StudioLabel(this);
    QPixmap brandPixmap = QPixmap::fromImage(pixelStudioLogo(76));
    brandPixmap.setDevicePixelRatio(2.0);
    brandMark->setPixmap(brandPixmap);
    brandMark->setObjectName(QStringLiteral("PixelStudioBrandLogo"));
    brandMark->setFixedSize(38, 38);
    heading->addWidget(brandMark);
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

    auto* workspace = new QWidget(this);
    auto* workspaceLayout = new PreviewWorkspaceLayout(workspace);
    workspaceLayout->viewport = scroll->viewport();
    // The board extends 6px past its alignment slot. Reserve that space in
    // the parent too, otherwise QWidget clips the halo at the workspace edge.
    workspaceLayout->setContentsMargins(6, 6, 6, 6);
    workspaceLayout->setSpacing(12);
    auto* previewPane = new QWidget(workspace);
    previewPane->setMinimumWidth(64);
    previewPane->setMaximumWidth(QWIDGETSIZE_MAX);
    auto* previewLayout = new QVBoxLayout(previewPane);
    previewLayout->setContentsMargins(0, 0, 8, 0);
    previewLayout->setSpacing(6);
    dimensions_ = new StudioLabel(previewPane);
    dimensions_->setWordWrap(true);
    dimensions_->hide();
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
    outputTitle_ = new StudioLabel(previewPane);
    outputTitle_->hide();
    auto* boardSlot = new QWidget(previewPane);
    boardSlot->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    outputBoard_ = new PixelBoard(workspace);
    workspaceLayout->preview = previewPane;
    workspaceLayout->board = outputBoard_;
    workspaceLayout->boardSlot = boardSlot;
    previewLayout->addWidget(boardSlot, 1);
    cad_ = new StudioCheckBox(text("圆角预览"), previewPane);
    cad_->setChecked(settings.value(QStringLiteral("cad"), true).toBool());
    outputBoard_->setCadAppearance(cad_->isChecked());
    auto* previewNote = new StudioLabel(text("未播放时显示待发送画面；播放中显示真实输出帧。"), previewPane);
    previewNote->setWordWrap(true);
    previewNote->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Minimum);
    previewNote->hide();
    outputBoard_->setToolTip(previewNote->text());
    // Keep the controls packed at the top; spare height belongs below the
    // screen rather than becoming gaps between the heading and size inputs.
    previewLayout->addStretch(1);
    connect(cad_, &QCheckBox::toggled, outputBoard_, &PixelBoard::setCadAppearance);
    connect(size15, &QPushButton::clicked, this, [this] { width_->setValue(15); height_->setValue(27); });
    connect(size14, &QPushButton::clicked, this, [this] { width_->setValue(14); height_->setValue(26); });

    auto* libraryPane = new QWidget(workspace);
    auto* libraryLayout = new QVBoxLayout(libraryPane);
    libraryLayout->setContentsMargins(8, 0, 0, 0);
    auto* filterRow = new QHBoxLayout;
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
    search_->setPlaceholderText(text("搜索动画、时钟或手绘角色"));
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
    gallery_->setGridSize(QSize(132, 105 + 2 * gallery_->fontMetrics().lineSpacing()));
    gallery_->setSpacing(0);
    gallery_->setWordWrap(true);
    gallery_->setMinimumSize(132, 0);
    auto* galleryRegion = new QWidget(libraryPane);
    auto* galleryRow = new QHBoxLayout(galleryRegion);
    galleryRow->setContentsMargins(0, 0, 0, 0);
    galleryRow->setSpacing(6);
    galleryRow->addWidget(gallery_, 1);
    // A sibling scrollbar cannot cover either the gallery frame or a card.
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
    workspaceLayout->addWidget(previewPane, 0);
    workspaceLayout->addWidget(libraryPane, 1);
    outer->addWidget(workspace, 1);
    connect(search_, &QLineEdit::textChanged, this, [this] { filterGallery(); });
    connect(category_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] { filterGallery(); });

    auto* outputGroup = new QGroupBox(text("WLED 输出通道"), this);
    auto* controls = new QGridLayout(outputGroup);
    transport_ = new StudioCombo(outputGroup);
    transport_->addItem(text("IP / DDP（无线）"), QStringLiteral("ddp"));
    transport_->addItem(text("USB / Adalight（有线）"), QStringLiteral("usb"));
    transport_->setCurrentIndex(qMax(0, transport_->findData(settings.value(QStringLiteral("transport"), QStringLiteral("ddp")))));
    host_ = new StudioLineEdit(settings.value(QStringLiteral("host"), QStringLiteral("192.168.1.100")).toString(), outputGroup);
    host_->setPlaceholderText(QStringLiteral("192.168.1.100"));
    serialPort_ = new StudioLineEdit(settings.value(QStringLiteral("serialPort")).toString(), outputGroup);
    serialPort_->setPlaceholderText(text("点击选择"));
    serialScan_ = new StudioButton(text("选择串口"), outputGroup);
    deviceSize_ = new StudioButton(text("读取屏幕尺寸"), outputGroup);
    fps_ = new StudioSpinBox(outputGroup);
    fps_->setRange(1, 60);
    fps_->setSuffix(QStringLiteral(" FPS"));
    fps_->setValue(settings.value(QStringLiteral("fps"), 60).toInt());
    brightness_ = new StudioSpinBox(outputGroup);
    brightness_->setRange(0, 255);
    brightness_->setValue(settings.value(QStringLiteral("brightness"), 255).toInt());
    brightnessSlider_ = new QSlider(Qt::Horizontal, outputGroup);
    brightnessSlider_->setRange(0, 255);
    brightnessSlider_->setValue(brightness_->value());
    brightnessSlider_->setPageStep(16);
    speed_ = new StudioDoubleSpinBox(outputGroup);
    speed_->setRange(0.25, 3.0);
    speed_->setSingleStep(0.05);
    speed_->setDecimals(2);
    speed_->setSuffix(QStringLiteral(" x"));
    speed_->setValue(settings.value(QStringLiteral("speed"), 1.0).toDouble());
    speedSlider_ = new QSlider(Qt::Horizontal, outputGroup);
    speedSlider_->setRange(25, 300);
    speedSlider_->setValue(qRound(speed_->value() * 100));
    speedSlider_->setPageStep(25);
    mapping_ = new StudioCombo(outputGroup);
    mapping_->setProperty("preferred", settings.value(QStringLiteral("mapping")).toString());
    clockFont_ = new StudioCombo(outputGroup);
    clockFont_->addItem(text("圆角像素"), QStringLiteral("rounded"));
    clockFont_->addItem(text("经典像素"), QStringLiteral("classic"));
    clockFont_->addItem(text("七段数码"), QStringLiteral("segment"));
    clockPalette_ = new StudioCombo(outputGroup);
    circuitPalette_ = new StudioCombo(outputGroup);
    circuitPalette_->addItem(text("冰蓝"), QStringLiteral("ice"));
    circuitPalette_->addItem(text("薄荷"), QStringLiteral("mint"));
    circuitPalette_->addItem(text("琥珀"), QStringLiteral("amber"));
    circuitPalette_->addItem(text("樱粉"), QStringLiteral("rose"));
    circuitPalette_->addItem(text("紫晶"), QStringLiteral("violet"));
    circuitPalette_->setCurrentIndex(qMax(0, circuitPalette_->findData(settings.value(QStringLiteral("circuitPalette"), QStringLiteral("ice")))));
    clockPalette_->addItem(text("薄荷"), QStringLiteral("mint"));
    clockPalette_->addItem(text("琥珀"), QStringLiteral("amber"));
    clockPalette_->addItem(text("冰蓝"), QStringLiteral("ice"));
    clockPalette_->addItem(text("自定义"), QStringLiteral("custom"));
    customClockPalette_ = settings.value(QStringLiteral("customClockPalette"), QStringLiteral("custom:#f2ebd6:#8af2c9:#397660")).toString();
    if (!QRegularExpression(QStringLiteral("^custom:(#[0-9a-fA-F]{6}):(#[0-9a-fA-F]{6}):(#[0-9a-fA-F]{6})$")).match(customClockPalette_).hasMatch())
        customClockPalette_ = QStringLiteral("custom:#f2ebd6:#8af2c9:#397660");
    clockFont_->setCurrentIndex(qMax(0, clockFont_->findData(settings.value(QStringLiteral("clockFont"), QStringLiteral("rounded")))));
    clockPalette_->setCurrentIndex(qMax(0, clockPalette_->findData(settings.value(QStringLiteral("clockPalette"), QStringLiteral("mint")))));
    controls->addWidget(new StudioLabel(text("输出方式"), outputGroup), 0, 0);
    controls->addWidget(transport_, 0, 1, 1, 2);
    controls->addWidget(new StudioLabel(text("帧率"), outputGroup), 0, 3);
    controls->addWidget(fps_, 0, 4);
    controls->addWidget(new StudioLabel(text("IP 地址"), outputGroup), 1, 0);
    controls->addWidget(host_, 1, 1);
    controls->addWidget(deviceSize_, 1, 2);
    controls->addWidget(new StudioLabel(text("USB 端口"), outputGroup), 1, 3);
    auto* serialControl = new QWidget(outputGroup);
    auto* serialLayout = new QHBoxLayout(serialControl);
    serialLayout->setContentsMargins(0, 0, 0, 0);
    serialLayout->addWidget(serialPort_, 1);
    serialLayout->addWidget(serialScan_);
    controls->addWidget(serialControl, 1, 4);
    controls->addWidget(new StudioLabel(text("排列"), outputGroup), 2, 0);
    controls->addWidget(mapping_, 2, 1, 1, 2);
    controls->addWidget(new StudioLabel(text("亮度"), outputGroup), 2, 3);
    auto* brightnessControl = new QWidget(outputGroup);
    auto* brightnessLayout = new QHBoxLayout(brightnessControl);
    brightnessLayout->setContentsMargins(0, 0, 0, 0);
    brightnessLayout->addWidget(brightnessSlider_, 1);
    brightnessLayout->addWidget(brightness_);
    controls->addWidget(brightnessControl, 2, 4);
    clockLabel_ = new StudioLabel(text("时钟样式"), outputGroup);
    clockControls_ = new QWidget(outputGroup);
    auto* clockLayout = new QHBoxLayout(clockControls_);
    clockLayout->setContentsMargins(0, 0, 0, 0);
    clockLayout->addWidget(clockFont_, 1);
    clockLayout->addWidget(clockPalette_);
    auto* editColors = new StudioButton(text("自定义配色"), clockControls_);
    customColorsButton_ = editColors;
    clockLayout->addWidget(editColors);
    connect(editColors, &QPushButton::clicked, this, [this] {
        QDialog dialog(this);
        dialog.setWindowTitle(localized(text("自定义配色")));
        dialog.setFont(font());
        auto* layout = new QVBoxLayout(&dialog);
        const auto* item = gallery_->currentItem();
        const QString mode = item ? item->data(Qt::UserRole).toString() : QStringLiteral("clock");
        auto paletteSettings = preferences();
        QString palette = paletteSettings.value(QStringLiteral("customPalette/") + mode,
            mode == QStringLiteral("clock") ? customClockPalette_
                : QStringLiteral("custom:#e5f5ff:#6ad3f5:#356e88")).toString();
        const QString selected = circuitPalette_->isVisible()
            ? circuitPalette_->currentData().toString() : clockPalette_->currentData().toString();
        if (selected == QStringLiteral("mint")) palette = QStringLiteral("custom:#f2ebd6:#8af2c9:#397660");
        if (selected == QStringLiteral("amber")) palette = QStringLiteral("custom:#ffe2ab:#ffad59:#925628");
        if (selected == QStringLiteral("ice")) palette = QStringLiteral("custom:#e5f5ff:#6ad3f5:#356e88");
        QStringList colors = palette.split(QLatin1Char(':')).mid(1);
        const QStringList labels = circuitPalette_->isVisible()
            ? QStringList{localized(text("高光颜色")), localized(text("主色")), localized(text("阴影颜色"))}
            : QStringList{localized(text("小时颜色")), localized(text("分钟颜色")), localized(text("分隔线颜色"))};
        for (int i = 0; i < 3; ++i) {
            auto* row = new QHBoxLayout;
            row->addWidget(new StudioLabel(labels[i], &dialog));
            auto* swatch = new QPushButton(colors[i], &dialog);
            auto refresh = [swatch, &colors, i] {
                swatch->setText(colors[i]);
                const QColor color(colors[i]);
                swatch->setStyleSheet(QStringLiteral("background-color:%1;color:%2;min-width:120px;min-height:30px;")
                    .arg(colors[i], color.lightness() > 140 ? QStringLiteral("black") : QStringLiteral("white")));
            };
            refresh();
            connect(swatch, &QPushButton::clicked, &dialog, [&, i, refresh] {
                const QColor color = QColorDialog::getColor(QColor(colors[i]), &dialog, labels[i]);
                if (color.isValid()) { colors[i] = color.name(); refresh(); }
            });
            row->addWidget(swatch);
            layout->addLayout(row);
        }
        auto* buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, &dialog);
        buttons->button(QDialogButtonBox::Ok)->setText(english_ ? QStringLiteral("Apply") : text("应用"));
        buttons->button(QDialogButtonBox::Cancel)->setText(english_ ? QStringLiteral("Cancel") : text("取消"));
        connect(buttons, &QDialogButtonBox::accepted, &dialog, &QDialog::accept);
        connect(buttons, &QDialogButtonBox::rejected, &dialog, &QDialog::reject);
        layout->addWidget(buttons);
        if (dialog.exec() == QDialog::Accepted) {
            const QString customPalette = QStringLiteral("custom:") + colors.join(QLatin1Char(':'));
            paletteSettings.setValue(QStringLiteral("customPalette/") + mode, customPalette);
            if (mode == QStringLiteral("clock")) {
                customClockPalette_ = customPalette;
                clockPalette_->setCurrentIndex(clockPalette_->findData(QStringLiteral("custom")));
            } else {
                circuitPalette_->setCurrentIndex(circuitPalette_->findData(QStringLiteral("custom")));
            }
            savePreferences();
            debounce_->start();
        }
    });
    controls->addWidget(clockLabel_, 3, 0);
    controls->addWidget(clockControls_, 3, 1, 1, 2);
    controls->addWidget(new StudioLabel(text("速度"), outputGroup), 3, 3);
    auto* speedControl = new QWidget(outputGroup);
    auto* speedLayout = new QHBoxLayout(speedControl);
    speedLayout->setContentsMargins(0, 0, 0, 0);
    speedLayout->addWidget(speedSlider_, 1);
    speedLayout->addWidget(speed_);
    controls->addWidget(speedControl, 3, 4);
    controls->setColumnStretch(1, 1);
    // A shared toolbar keeps screen setup visible without imposing a minimum
    // text width on the aspect-ratio-controlled preview column.
    auto* screenToolbar = new QHBoxLayout;
    screenToolbar->setSpacing(12);
    screenToolbar->addLayout(sizeRow);
    screenToolbar->addLayout(presetRow);
    screenToolbar->addWidget(cad_);
    screenToolbar->addStretch(1);
    width_->setMaximumWidth(72);
    height_->setMaximumWidth(72);

    // Three aligned label/control pairs per row, rather than a tall form
    // with a largely empty final row. Keep the existing widgets and signals.
    auto* fpsLabel = controls->itemAtPosition(0, 3)->widget();
    auto* mappingLabel = controls->itemAtPosition(2, 0)->widget();
    auto* serialLabel = controls->itemAtPosition(1, 3)->widget();
    auto* brightnessLabel = controls->itemAtPosition(2, 3)->widget();
    auto* speedLabel = controls->itemAtPosition(3, 3)->widget();
    controls->addWidget(transport_, 0, 1);
    controls->addWidget(fpsLabel, 0, 2);
    controls->removeWidget(fps_);
    auto* fpsControl = new QWidget(outputGroup);
    auto* fpsLayout = new QHBoxLayout(fpsControl);
    fpsLayout->setContentsMargins(0, 0, 0, 0);
    auto* fpsSlider = new QSlider(Qt::Horizontal, fpsControl);
    fpsSlider->setRange(fps_->minimum(), fps_->maximum());
    fpsSlider->setValue(fps_->value());
    fpsSlider->setPageStep(5);
    fps_->setFixedWidth(88);
    fpsLayout->addWidget(fpsSlider, 1);
    fpsLayout->addWidget(fps_);
    connect(fpsSlider, &QSlider::valueChanged, fps_, &QSpinBox::setValue);
    connect(fps_, qOverload<int>(&QSpinBox::valueChanged), fpsSlider, &QSlider::setValue);
    controls->addWidget(fpsControl, 0, 3);
    controls->addWidget(mappingLabel, 0, 4);
    controls->addWidget(mapping_, 0, 5);
    auto* addressControl = new QWidget(outputGroup);
    auto* addressLayout = new QHBoxLayout(addressControl);
    addressLayout->setContentsMargins(0, 0, 0, 0);
    addressLayout->addWidget(host_, 1);
    addressLayout->addWidget(deviceSize_);
    controls->addWidget(addressControl, 1, 1);
    controls->addWidget(serialLabel, 1, 2);
    controls->addWidget(serialControl, 1, 3);
    controls->addWidget(brightnessLabel, 1, 4);
    controls->addWidget(brightnessControl, 1, 5);
    controls->addWidget(clockLabel_, 2, 0);
    controls->addWidget(clockControls_, 2, 1, 1, 3);
    controls->addWidget(speedLabel, 2, 4);
    controls->addWidget(speedControl, 2, 5);
    controls->setColumnStretch(1, 1);
    controls->setColumnStretch(3, 1);
    controls->setColumnStretch(5, 1);
    controls->setHorizontalSpacing(10);
    controls->setVerticalSpacing(6);
    shell->addWidget(outputGroup);

    auto* actions = new QHBoxLayout;
    start_ = new PlaybackButton(false, this);
    start_->setObjectName(QStringLiteral("PixelStudioStart"));
    start_->setIcon(playbackIcon(false));
    start_->setIconSize(QSize(24, 24));
    start_->setAccessibleName(text("开始播放"));
    start_->setFixedSize(112, 38);
    start_->setStyleSheet(QStringLiteral(
        "QPushButton { background:#8ee6ba; border:1px solid #8ee6ba; border-radius:6px; padding:0; }"
        "QPushButton:hover { background:#a4f0cb; border-color:#a4f0cb; }"
        "QPushButton:pressed { background:#67c899; border-color:#67c899; }"
        "QPushButton:disabled { background:#587d69; border-color:#587d69; }"
        "QPushButton:focus { border:2px solid #effff6; }"));
    start_->setToolTip(text("开始 / 无缝应用"));
    start_->setMinimumWidth(112);
    stop_ = new PlaybackButton(true, this);
    stop_->setObjectName(QStringLiteral("PixelStudioStop"));
    stop_->setIcon(playbackIcon(true));
    stop_->setIconSize(QSize(24, 24));
    stop_->setAccessibleName(text("停止播放"));
    stop_->setFixedSize(112, 38);
    stop_->setStyleSheet(QStringLiteral(
        "QPushButton { background:#d95459; border:1px solid #d95459; border-radius:6px; padding:0; }"
        "QPushButton:hover { background:#ed6c71; border-color:#ed6c71; }"
        "QPushButton:pressed { background:#b84048; border-color:#b84048; }"
        "QPushButton:disabled { background:#a84c52; border-color:#a84c52; }"
        "QPushButton:focus { border:2px solid #ffe9ea; }"));
    stop_->setToolTip(text("停止播放"));
    stop_->setMinimumWidth(112);
    autoStart_ = new StudioCheckBox(text("启动 OpenRGB 时自动播放"), this);
    autoStart_->setChecked(settings.value(QStringLiteral("autoStart"), false).toBool());
    actions->addWidget(start_);
    actions->addWidget(stop_);
    actions->addWidget(autoStart_);
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
    auto* limits = new StudioLabel(text("DDP 使用局域网；USB 使用 ESP32-C3 原生 USB CDC + 定制 WLED。两个通道共用同一动画库。"), this);
    limits->setWordWrap(true);
    limits->hide();
    // Output transport guidance belongs in Settings, not on the live controls.
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
        auto* version = new QLabel(english_
        ? QStringLiteral("Version 0.1.10 · OpenRGB plugin\nBuilt: %1").arg(QString::fromLatin1(__DATE__))
        : text("版本 0.1.10 · OpenRGB 插件\n编译日期：%1").arg(QString::fromLatin1(__DATE__)), &about);
        layout->addWidget(version);
        auto* description = new QLabel(english_
            ? QStringLiteral("Small pixels. Endless imagination.\n\nA pixel animation studio for WLED. The web app and OpenRGB plugin share an animation library, with live previews, custom palettes and USB / Adalight or DDP output.\n\nAuthors & collaborators\nGPT-5.3 Codex Spark · GPT-5.6 Sol · GPT-6 Sol · GPT-6 Astra\nOWEN\n\nCreated through AI and human collaboration: AI collaborators contribute to design and development; OWEN guides the product, visual direction and device feedback.\n\nSpecial thanks: David Wang\n\nIndependent project. Thanks to the WLED, OpenRGB, Qt and Node.js communities. Not an official WLED or OpenRGB release.")
            : text("方寸像素，无限想象。\n\n为 WLED 打造的像素动画工作室。网页版与 OpenRGB 插件共享动画库，支持实时预览、自定义配色，以及 USB / Adalight 和 DDP 输出。\n\n作者与协作成员\nGPT-5.3 Codex Spark · GPT-5.6 Sol · GPT-6 Sol · GPT-6 Astra\nOWEN\n\n由 AI 与人类共同创作：AI 协作成员参与设计和开发；OWEN 主导产品方向、视觉取舍与设备体验反馈。\n\n特别鸣谢：David Wang\n\n独立项目，感谢 WLED、OpenRGB、Qt 与 Node.js 社区。本项目不是 WLED 或 OpenRGB 的官方发行版。"), &about);
        description->setWordWrap(true); description->setMaximumWidth(560);
        description->setTextInteractionFlags(Qt::TextSelectableByMouse);
        layout->addWidget(description);
        auto* buttons = new QDialogButtonBox(&about);
        auto* closeButton = new StudioButton(english_ ? QStringLiteral("Close") : text("关闭"), &about);
        closeButton->setMinimumSize(88, 32);
        buttons->addButton(closeButton, QDialogButtonBox::RejectRole);
        connect(buttons, &QDialogButtonBox::rejected, &about, &QDialog::reject);
        layout->addWidget(buttons); about.exec();
    });
    savedMode_ = settings.value(QStringLiteral("mode"), QStringLiteral("portrait_fireflies")).toString();

    if (darkTheme) {
        setStyleSheet(QStringLiteral(
            "QWidget#PixelStudioPanel { background:#14201b; color:#e1eee6; }"
            "QWidget#PixelStudioPanel QGroupBox { border:1px solid #3c5446; border-radius:8px; margin-top:9px; padding-top:10px; }"
            "QWidget#PixelStudioPanel QGroupBox::title { subcontrol-origin:margin; left:10px; padding:0 5px; }"
            "QWidget#PixelStudioPanel QListWidget { background:#0b1510; border:1px solid #385042; border-radius:8px; }"
            "QWidget#PixelStudioPanel QListWidget::item { border:1px solid #304b3b; border-radius:6px; padding:4px; }"
            "QWidget#PixelStudioPanel QListWidget::item:selected { background:#284b3a; border:1px solid #8ee6ba; }"
            "QComboBox#PixelStudioCategory { min-width:88px; font-weight:bold; }"));
    }

    // Apply font rules to every control, overriding the host's serif widget
    // stylesheet rather than changing only the panel's inherited QFont.
    setStyleSheet(styleSheet() + QStringLiteral(
        " QWidget#PixelStudioPanel QWidget { font-family:'Segoe UI','Microsoft YaHei UI','Microsoft YaHei'; font-size:10pt; }"
        " QWidget#PixelStudioPanel QLabel#PixelStudioTitle { font-size:20pt; font-weight:bold; }"
        " QWidget#PixelStudioPanel QPushButton { min-height:24px; padding:0px 8px; text-align:center; }"
        " QWidget#PixelStudioPanel QComboBox { min-height:24px; padding:0px 6px; }"
        " QWidget#PixelStudioPanel QSpinBox, QWidget#PixelStudioPanel QDoubleSpinBox { min-height:24px; padding-top:0px; padding-bottom:0px; }"));
    libraryDialog->setStyleSheet(QStringLiteral(
        "QWidget { font-family:'Segoe UI','Microsoft YaHei UI','Microsoft YaHei'; font-size:10pt; }"));
    // Match the native editor rectangles to the 28px button/selector row.
    // Native editors and adjacent labels share an unshifted vertical center.
    for (auto* edit : findChildren<QLineEdit*>()) {
        centerEditorInk(edit);
        connect(edit, &QLineEdit::textChanged, edit, [edit] { centerEditorInk(edit); });
        edit->setAlignment(Qt::AlignVCenter | Qt::AlignLeft);
        if (!qobject_cast<QAbstractSpinBox*>(edit->parentWidget())) edit->setFixedHeight(30);
    }
    host_->setMinimumWidth(host_->fontMetrics().horizontalAdvance(QStringLiteral("255.255.255.255")) + 24);
    for (auto* spin : findChildren<QAbstractSpinBox*>()) spin->setFixedHeight(30);
    for (auto* combo : findChildren<QComboBox*>()) combo->setFixedHeight(30);
    for (auto* slider : findChildren<QSlider*>()) slider->setFixedHeight(30);
    for (auto* button : findChildren<QPushButton*>()) {
        if (button != start_ && button != stop_ && button != settingsButton) button->setFixedHeight(30);
    }
    start_->setFixedSize(84, 44);
    stop_->setFixedSize(84, 44);
    autoStart_->setFixedHeight(44);
    shell->setContentsMargins(12, 8, 12, 12);
    settingsButton->setFixedSize(40, 40);
    serialScan_->setFixedSize(88, 30);
    fps_->setFixedSize(88, 30);
    // Keep output routing in the settings dialog; leave live adjustments in the panel.
    outputGroup->setTitle(QString());
    outputGroup->setProperty("pixelStudioSource_title", QString());
    screenSettings->setTitle(text("WLED 输出设置"));
    screenSettings->setProperty("pixelStudioSource_title", text("WLED 输出设置"));
    const QVariant selectedTransport = transport_->currentData();
    QVariant usbTransport, ddpTransport;
    for (int i = 0; i < transport_->count(); ++i) {
        if (transport_->itemText(i).contains(QStringLiteral("USB"), Qt::CaseInsensitive))
            usbTransport = transport_->itemData(i);
        else
            ddpTransport = transport_->itemData(i);
    }
    transport_->clear();
    transport_->addItem(QStringLiteral("USB/Adalight"), usbTransport);
    transport_->addItem(QStringLiteral("DDP"), ddpTransport);
    transport_->setCurrentIndex(qMax(0, transport_->findData(selectedTransport)));
    auto* connectionLayout = new QGridLayout;
    connectionLayout->setHorizontalSpacing(24);
    connectionLayout->setVerticalSpacing(10);
    connectionLayout->setColumnStretch(1, 1);
    auto addOutputSetting = [connectionLayout, screenSettings](int row, const QString& title, QWidget* control) {
        auto* label = new StudioLabel(title, screenSettings);
        label->setBuddy(control);
        connectionLayout->addWidget(label, row, 0, Qt::AlignVCenter);
        connectionLayout->addWidget(control, row, 1, Qt::AlignVCenter);
    };
    addOutputSetting(0, text("输出方式"), transport_);
    addOutputSetting(1, text("USB 端口"), serialControl);
    auto* settingsAddress = new QWidget(screenSettings);
    auto* settingsAddressLayout = new QHBoxLayout(settingsAddress);
    settingsAddressLayout->setContentsMargins(0, 0, 0, 0);
    settingsAddressLayout->addWidget(host_, 1);
    settingsAddressLayout->addWidget(deviceSize_);
    addOutputSetting(2, text("IP 地址"), settingsAddress);
    screenSettingsLayout->removeItem(screenToolbar);
    screenSettingsLayout->addLayout(connectionLayout);
    screenSettingsLayout->addLayout(screenToolbar);
    auto* displayLayout = new QGridLayout;
    displayLayout->setHorizontalSpacing(24);
    displayLayout->setVerticalSpacing(10);
    displayLayout->setColumnStretch(1, 1);
    displayLayout->addWidget(new StudioLabel(text("排列"), screenSettings), 0, 0, Qt::AlignVCenter);
    displayLayout->addWidget(mapping_, 0, 1, Qt::AlignVCenter);
    displayLayout->addWidget(new StudioLabel(text("帧率"), screenSettings), 1, 0, Qt::AlignVCenter);
    displayLayout->addWidget(fpsControl, 1, 1, Qt::AlignVCenter);
    const int settingLabelWidth = fontMetrics().horizontalAdvance(QStringLiteral("Output mode")) + 16;
    interfaceLayout->setColumnStretch(0, 0);
    interfaceLayout->setColumnMinimumWidth(0, settingLabelWidth);
    interfaceLayout->setColumnStretch(1, 1);
    screenSettingsLayout->setContentsMargins(12, 16, 12, 12);
    connectionLayout->setContentsMargins(0, 0, 0, 0);
    displayLayout->setContentsMargins(0, 0, 0, 0);
    const int deviceButtonWidth = qMax(fontMetrics().horizontalAdvance(QStringLiteral("Read screen size")),
                                      fontMetrics().horizontalAdvance(text("读取屏幕尺寸"))) + 28;
    serialScan_->setFixedSize(deviceButtonWidth, 30);
    deviceSize_->setFixedSize(deviceButtonWidth, 30);
    width_->setFixedSize(64, 30);
    height_->setFixedSize(64, 30);
    screenToolbar->setSpacing(10);
    connectionLayout->setColumnMinimumWidth(0, settingLabelWidth);
    displayLayout->setColumnMinimumWidth(0, settingLabelWidth);
    screenSettingsLayout->addLayout(displayLayout);

    // Swap the two library paths without changing the spanning reload button.
    if (auto* libraryGrid = qobject_cast<QGridLayout*>(setup->layout())) {
        struct LibraryCell { QLayoutItem* item; int row; int column; int rowSpan; int columnSpan; };
        QList<LibraryCell> cells;
        while (libraryGrid->count()) {
            int row, column, rowSpan, columnSpan;
            libraryGrid->getItemPosition(0, &row, &column, &rowSpan, &columnSpan);
            cells.append({libraryGrid->takeAt(0), row, column, rowSpan, columnSpan});
        }
        for (const auto& cell : cells) {
            const int row = cell.rowSpan == 1 && cell.row < 2 ? 1 - cell.row : cell.row;
            libraryGrid->addItem(cell.item, row, cell.column, cell.rowSpan, cell.columnSpan);
        }
        interfaceLayout->removeWidget(web);
        libraryGrid->addWidget(web, libraryGrid->rowCount(), 0, 1, libraryGrid->columnCount());
    }

    while (auto* item = controls->takeAt(0)) {
        if (auto* widget = item->widget()) widget->hide();
        delete item;
    }
    for (int column = 0; column < 6; ++column) {
        controls->setColumnStretch(column, 0);
        controls->setColumnMinimumWidth(column, 0);
    }
    auto makeAdjustment = [outputGroup](QSlider* slider, QWidget* editor) {
        auto* widget = new QWidget(outputGroup);
        auto* row = new QHBoxLayout(widget);
        row->setContentsMargins(0, 0, 0, 0);
        row->addWidget(slider, 1, Qt::AlignVCenter);
        row->addWidget(editor, 0, Qt::AlignVCenter);
        slider->show();
        editor->show();
        return widget;
    };
    controls->addWidget(new StudioLabel(text("亮度"), outputGroup), 0, 0, Qt::AlignVCenter);
    controls->addWidget(makeAdjustment(brightnessSlider_, brightness_), 0, 1);
    controls->addWidget(new StudioLabel(text("速度"), outputGroup), 0, 2, Qt::AlignVCenter);
    controls->addWidget(makeAdjustment(speedSlider_, speed_), 0, 3);
    clockLabel_->setText(text("样式"));
    clockLabel_->setProperty("pixelStudioSource_text", text("样式"));
    clockColorLabel_ = new StudioLabel(text("配色"), outputGroup);
    clockColorControls_ = new QWidget(outputGroup);
    auto* colorRow = new QHBoxLayout(clockColorControls_);
    colorRow->setContentsMargins(0, 0, 0, 0);
    colorRow->setSpacing(8);
    const auto customColorButtons = clockControls_->findChildren<QPushButton*>();
    colorRow->addWidget(clockPalette_, 1, Qt::AlignVCenter);
    for (auto* button : customColorButtons) {
        button->setMinimumWidth(0);
        button->setMaximumWidth(QWIDGETSIZE_MAX);
        button->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
        button->setFixedHeight(30);
        colorRow->addWidget(button, 1, Qt::AlignVCenter);
    }
    controls->addWidget(clockLabel_, 1, 0, Qt::AlignVCenter);
    controls->addWidget(clockControls_, 1, 1, Qt::AlignVCenter);
    controls->addWidget(clockColorLabel_, 1, 2, Qt::AlignVCenter);
    controls->addWidget(clockColorControls_, 1, 3, Qt::AlignVCenter);
    for (QWidget* widget : {static_cast<QWidget*>(clockColorLabel_), clockColorControls_}) {
        auto policy = widget->sizePolicy();
        policy.setRetainSizeWhenHidden(true);
        widget->setSizePolicy(policy);
    }
    for (QWidget* widget : {static_cast<QWidget*>(clockLabel_), clockControls_}) {
        auto policy = widget->sizePolicy();
        policy.setRetainSizeWhenHidden(true);
        widget->setSizePolicy(policy);
    }
    controls->setRowMinimumHeight(1, 30);
    controls->setContentsMargins(10, 8, 10, 8);
    controls->setVerticalSpacing(6);
    outputGroup->setObjectName(QStringLiteral("PixelStudioLiveAdjustments"));
    outputGroup->setStyleSheet(QStringLiteral(
        "QGroupBox#PixelStudioLiveAdjustments { margin-top:0px; padding-top:0px; }"));
    libraryDialog->setStyleSheet(libraryDialog->styleSheet() + QStringLiteral(
        " QGroupBox { margin-top:16px; padding-top:12px; }"
        " QGroupBox::title { subcontrol-origin:margin; subcontrol-position:top left; left:10px; padding:3px 5px; }"));
    controls->setColumnStretch(1, 1);
    controls->setColumnStretch(3, 1);
    clockFont_->setFixedHeight(30);
    clockPalette_->setFixedHeight(30);
    const QVariant selectedClockPalette = clockPalette_->currentData();
    const int icePaletteIndex = clockPalette_->findData(QStringLiteral("ice"));
    if (icePaletteIndex > 0) {
        const QString iceTitle = clockPalette_->itemText(icePaletteIndex);
        clockPalette_->removeItem(icePaletteIndex);
        clockPalette_->insertItem(0, iceTitle, QStringLiteral("ice"));
        clockPalette_->setCurrentIndex(qMax(0, clockPalette_->findData(selectedClockPalette)));
    }
    clockPalette_->setMinimumWidth(0);
    clockPalette_->setMaximumWidth(QWIDGETSIZE_MAX);
    clockPalette_->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
    // One standard width for editable fields, selectors and adjacent actions.
    const int standardWidth = 180;
    const int settingControlSpan = standardWidth * 2 + 8;
    for (QWidget* widget : {static_cast<QWidget*>(language_), static_cast<QWidget*>(theme_),
         static_cast<QWidget*>(transport_), static_cast<QWidget*>(mapping_),
         static_cast<QWidget*>(serialPort_), static_cast<QWidget*>(host_),
         static_cast<QWidget*>(serialScan_), static_cast<QWidget*>(deviceSize_),
         static_cast<QWidget*>(fps_), static_cast<QWidget*>(projectPath_), static_cast<QWidget*>(nodePath_)})
        widget->setFixedSize(standardWidth, 30);
    for (auto* grid : {interfaceLayout, connectionLayout, displayLayout}) {
        grid->setColumnStretch(0, 1);
        grid->setColumnStretch(1, 0);
        grid->setColumnMinimumWidth(1, settingControlSpan);
        for (int i = 0; i < grid->count(); ++i)
            if (auto* widget = grid->itemAt(i)->widget()) grid->setAlignment(widget, Qt::AlignRight | Qt::AlignVCenter);
    }
    serialControl->setFixedWidth(settingControlSpan);
    settingsAddress->setFixedWidth(settingControlSpan);
    fpsControl->setFixedWidth(settingControlSpan);
    if (serialControl->layout()) serialControl->layout()->setSpacing(8);
    settingsAddressLayout->setSpacing(8);
    if (auto* libraryGrid = qobject_cast<QGridLayout*>(setup->layout())) {
        libraryGrid->setColumnStretch(0, 0);
        libraryGrid->setColumnStretch(1, 1);
        libraryGrid->setHorizontalSpacing(8);
        for (auto* button : setup->findChildren<QPushButton*>()) {
            if (button != web) {
                button->setMinimumWidth(0);
                button->setMaximumWidth(QWIDGETSIZE_MAX);
                button->setFixedHeight(30);
                button->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Fixed);
            }
        }
        libraryGrid->removeWidget(load_);
        libraryGrid->addWidget(load_, 0, 3, 2, 1, Qt::AlignVCenter);
        libraryGrid->setColumnStretch(2, 0);
        libraryGrid->setColumnStretch(3, 0);
        libraryGrid->removeWidget(web);
        libraryGrid->addWidget(web, 2, 0, 1, 4);
        libraryGrid->setRowMinimumHeight(3, 0);
        for (auto* path : {projectPath_, nodePath_}) {
            path->setMinimumWidth(180);
            path->setMaximumWidth(QWIDGETSIZE_MAX);
            path->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
        }
    }
    // Native-style settings: labels stay on the left; one complete control
    // column is anchored to the right. Composite rows share its outer edges.
    const int rightColumnWidth = 340;
    const int actionWidth = 122;
    for (auto* selector : {language_, theme_, transport_, mapping_})
        selector->setFixedSize(rightColumnWidth, 30);
    serialPort_->setFixedSize(rightColumnWidth - actionWidth - 8, 30);
    host_->setFixedSize(rightColumnWidth - actionWidth - 8, 30);
    serialScan_->setFixedSize(actionWidth, 30);
    deviceSize_->setFixedSize(actionWidth, 30);
    fps_->setFixedSize(88, 30);
    for (auto* composite : {serialControl, settingsAddress, fpsControl})
        composite->setFixedWidth(rightColumnWidth);
    for (auto* grid : {interfaceLayout, connectionLayout, displayLayout}) {
        grid->setColumnMinimumWidth(1, rightColumnWidth);
        grid->setColumnStretch(0, 1);
        grid->setColumnStretch(1, 0);
        for (int i = 0; i < grid->count(); ++i) {
            if (auto* widget = grid->itemAt(i)->widget()) {
                const bool isLabel = qobject_cast<QLabel*>(widget) != nullptr;
                grid->setAlignment(widget, (isLabel ? Qt::AlignLeft : Qt::AlignRight) | Qt::AlignVCenter);
            }
        }
    }
    screenSettingsLayout->removeItem(screenToolbar);
    screenToolbar->removeItem(sizeRow);
    screenToolbar->removeItem(presetRow);
    screenToolbar->removeWidget(cad_);
    delete screenToolbar;
    auto* matrixDimensions = new QWidget(screenSettings);
    auto* dimensionLayout = new QHBoxLayout(matrixDimensions);
    dimensionLayout->setContentsMargins(0, 0, 0, 0);
    dimensionLayout->setSpacing(8);
    dimensionLayout->addLayout(sizeRow);
    dimensionLayout->addStretch(1);
    dimensionLayout->addWidget(cad_, 0, Qt::AlignVCenter);
    matrixDimensions->setFixedWidth(rightColumnWidth);
    auto* matrixPresets = new QWidget(screenSettings);
    auto* presetContainer = new QHBoxLayout(matrixPresets);
    presetContainer->setContentsMargins(0, 0, 0, 0);
    presetContainer->addLayout(presetRow);
    presetContainer->addStretch(1);
    matrixPresets->setFixedWidth(rightColumnWidth);
    addOutputSetting(3, text("屏幕尺寸"), matrixDimensions);
    addOutputSetting(4, text("快捷尺寸"), matrixPresets);
    // The display rows follow immediately after screen dimensions.
    while (displayLayout->count()) {
        int row, column, rowSpan, columnSpan;
        displayLayout->getItemPosition(0, &row, &column, &rowSpan, &columnSpan);
        connectionLayout->addItem(displayLayout->takeAt(0), row + 5, column, rowSpan, columnSpan);
    }
    screenSettingsLayout->removeItem(displayLayout);
    delete displayLayout;
    colorMatching_ = new StudioCombo(screenSettings);
    colorMatching_->addItem(text("匹配网页颜色（推荐）"), true);
    colorMatching_->addItem(text("保留设备颜色"), false);
    colorMatching_->setCurrentIndex(settings.value(QStringLiteral("colorMatching"), true).toBool() ? 0 : 1);
    colorMatching_->setFixedSize(rightColumnWidth, 30);
    gamma_ = new StudioDoubleSpinBox(screenSettings);
    gamma_->setRange(1.0, 4.0);
    gamma_->setDecimals(2);
    gamma_->setSingleStep(0.05);
    gamma_->setValue(settings.value(QStringLiteral("gamma"), 2.8).toDouble());
    gamma_->setFixedSize(rightColumnWidth, 30);
    gamma_->setAlignment(Qt::AlignCenter);
    gamma_->setToolTip(QStringLiteral("USB uses detected device Gamma; unknown or disabled realtime Gamma bypasses compensation.\nUSB 使用设备 Gamma；未知或实时 Gamma 关闭时不补偿。"));
    addOutputSetting(7, text("颜色还原"), colorMatching_);
    // Internal compatibility value only; color matching uses device settings.
    gamma_->hide();
    gamma_->setEnabled(colorMatching_->currentData().toBool());
    liveLayout_ = controls;
    brightnessLabel_ = controls->itemAtPosition(0, 0)->widget();
    brightnessControls_ = controls->itemAtPosition(0, 1)->widget();
    speedLabel_ = controls->itemAtPosition(0, 2)->widget();
    speedControls_ = controls->itemAtPosition(0, 3)->widget();
    // Native labels avoid clipping from the optical text-painting override.
    controls->removeWidget(clockLabel_);
    delete clockLabel_;
    clockLabel_ = new StudioLabel(text("样式"), outputGroup);
    controls->removeWidget(clockColorLabel_);
    delete clockColorLabel_;
    clockColorLabel_ = new StudioLabel(text("配色"), outputGroup);
    for (QWidget** widget : {&brightnessLabel_, &speedLabel_}) {
        controls->removeWidget(*widget);
        delete *widget;
        *widget = new StudioLabel(widget == &brightnessLabel_ ? text("亮度") : text("速度"), outputGroup);
    }
    for (QLabel* label : {qobject_cast<QLabel*>(brightnessLabel_), qobject_cast<QLabel*>(speedLabel_), clockLabel_, clockColorLabel_}) {
        if (!label) continue;
        label->setAlignment(Qt::AlignLeft | Qt::AlignVCenter);
        label->setMinimumWidth(label->fontMetrics().horizontalAdvance(QStringLiteral("Colors")) + 8);
        label->setFixedHeight(36);
        label->setMargin(0);
        label->setContentsMargins(0, 0, 0, 0);
        label->setStyleSheet(QStringLiteral("QLabel { padding:0; margin:0; border:none; background:transparent; }"));
    }
    controls->setContentsMargins(16, 16, 16, 16);
    controls->setVerticalSpacing(8);
    controls->setRowStretch(0, 1);
    controls->setRowStretch(1, 1);
    controls->setColumnStretch(1, 1);
    controls->setColumnStretch(3, 1);
    clockControls_->setFixedHeight(36);
    clockColorControls_->setFixedHeight(36);
    outputGroup->setStyleSheet(QStringLiteral("QGroupBox { margin:0; padding:0; }"));
    outputGroup->setFixedHeight(100);
    animationColorsButton_ = new StudioButton(text("自定义配色"), outputGroup);
    animationColorsButton_->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Fixed);
    animationColorsButton_->setFixedHeight(30);
    connect(animationColorsButton_, &QPushButton::clicked, customColorsButton_, &QPushButton::click);
    arrangeLiveControls(false);
    for (auto* button : clockControls_->findChildren<QPushButton*>()) button->setFixedHeight(30);
    for (auto* row : clockControls_->findChildren<QHBoxLayout*>()) {
        row->setContentsMargins(0, 0, 0, 0);
        for (int i = 0; i < row->count(); ++i)
            if (auto* widget = row->itemAt(i)->widget()) row->setAlignment(widget, Qt::AlignVCenter);
    }
    colorRow->insertWidget(0, circuitPalette_, 1, Qt::AlignVCenter);
    circuitPalette_->hide();
    clockPalette_->addItem(text("樱粉"), QStringLiteral("rose"));
    clockPalette_->addItem(text("紫晶"), QStringLiteral("violet"));
    const bool customClockSelected = clockPalette_->currentData().toString() == QStringLiteral("custom");
    clockPalette_->removeItem(clockPalette_->findData(QStringLiteral("custom")));
    clockPalette_->addItem(text("自定义"), QStringLiteral("custom"));
    if (customClockSelected) clockPalette_->setCurrentIndex(clockPalette_->findData(QStringLiteral("custom")));
    circuitPalette_->insertItem(0, english_ ? QStringLiteral("Original") : QStringLiteral("原始"), QStringLiteral("original"));
    circuitPalette_->addItem(text("自定义"), QStringLiteral("custom"));
    circuitPalette_->setCurrentIndex(qMax(0, circuitPalette_->findData(
        settings.value(QStringLiteral("circuitPalette"), QStringLiteral("ice")))));
    connect(customColorsButton_, &QPushButton::clicked, this, [this] {
        if (circuitPalette_->isVisible() && clockPalette_->currentData().toString() == QStringLiteral("custom"))
            circuitPalette_->setCurrentIndex(circuitPalette_->findData(QStringLiteral("custom")));
    });
    randomPlayback_ = new StudioCheckBox(text("随机播放"), this);
    randomPlayback_->setFixedHeight(30);
    randomPlayback_->setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
    for (auto* row : findChildren<QHBoxLayout*>()) {
        const int searchIndex = row->indexOf(search_);
        if (searchIndex >= 0) {
            row->insertWidget(searchIndex + 1, randomPlayback_, 0, Qt::AlignVCenter);
            break;
        }
    }
    randomTimer_ = new QTimer(this);
    randomDuration_ = new StudioSpinBox(this);
    randomDuration_->setRange(3, 3600);
    randomDuration_->setSuffix(QStringLiteral(" 秒"));
    randomDuration_->setValue(settings.value(QStringLiteral("randomDuration"), 20).toInt());
    randomDuration_->setFixedSize(72, 30);
    randomDuration_->setAlignment(Qt::AlignCenter);
    randomTimer_->setInterval(randomDuration_->value() * 1000);
    for (auto* row : findChildren<QHBoxLayout*>()) {
        const int randomIndex = row->indexOf(randomPlayback_);
        if (randomIndex >= 0) {
            row->removeWidget(randomPlayback_);
            auto* randomControls = new QWidget(this);
            auto* randomLayout = new QHBoxLayout(randomControls);
            randomLayout->setContentsMargins(0, 0, 0, 0);
            randomLayout->setSpacing(2);
            randomLayout->addWidget(randomPlayback_, 0, Qt::AlignVCenter);
            randomLayout->addWidget(randomDuration_, 0, Qt::AlignVCenter);
            row->insertWidget(randomIndex, randomControls, 0, Qt::AlignVCenter);
            break;
        }
    }
    connect(randomTimer_, &QTimer::timeout, this, &PixelStudioPanel::advanceRandomAnimation);
    connect(randomPlayback_, &QCheckBox::toggled, this, [this] { updateControls(); });
    connect(randomDuration_, qOverload<int>(&QSpinBox::valueChanged), this, [this](int seconds) {
        randomTimer_->setInterval(seconds * 1000);
        if (randomTimer_->isActive()) randomTimer_->start();
        savePreferences();
    });
    brightness_->setFixedSize(88, 30);
    speed_->setFixedSize(88, 30);
    fps_->setAlignment(Qt::AlignCenter);
    brightness_->setAlignment(Qt::AlignCenter);
    speed_->setAlignment(Qt::AlignCenter);
    settingsButton->setStyleSheet(QStringLiteral("QPushButton { min-width:40px; max-width:40px; min-height:40px; max-height:40px; padding:0; }"));
    applyTheme();
    connect(theme_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] {
        applyTheme();
        auto prefs = preferences();
        prefs.setValue(QStringLiteral("theme"), theme_->currentData());
    });
    for (int i = 0; i < controls->count(); ++i) {
        if (auto* widget = controls->itemAt(i)->widget()) controls->setAlignment(widget, Qt::AlignVCenter);
    }
    for (auto* spin : {width_, height_}) {
        spin->setFixedWidth(72);
        spin->setAlignment(Qt::AlignCenter);
    }
    size15->setFixedWidth(72);
    size14->setFixedWidth(72);
    debounce_ = new QTimer(this);
    debounce_->setSingleShot(true);
    debounce_->setInterval(60);
    connect(debounce_, &QTimer::timeout, this, &PixelStudioPanel::updatePreview);
    auto changed = [this] { debounce_->start(); };
    for (auto* spin : { width_, height_, brightness_, fps_ }) {
        connect(spin, qOverload<int>(&QSpinBox::valueChanged), this, changed);
    }
    connect(speed_, qOverload<double>(&QDoubleSpinBox::valueChanged), this, changed);
    connect(gamma_, qOverload<double>(&QDoubleSpinBox::valueChanged), this, changed);
    connect(colorMatching_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this, changed] {
        gamma_->setEnabled(colorMatching_->currentData().toBool());
        changed();
    });
    connect(brightnessSlider_, &QSlider::valueChanged, brightness_, &QSpinBox::setValue);
    connect(brightness_, qOverload<int>(&QSpinBox::valueChanged), brightnessSlider_, &QSlider::setValue);
    connect(speedSlider_, &QSlider::valueChanged, this, [this](int value) { speed_->setValue(value / 100.0); });
    connect(speed_, qOverload<double>(&QDoubleSpinBox::valueChanged), this,
        [this](double value) { speedSlider_->setValue(qRound(value * 100)); });
    for (auto* combo : { transport_, mapping_, clockFont_, clockPalette_, circuitPalette_ }) {
        connect(combo, qOverload<int>(&QComboBox::currentIndexChanged), this, changed);
    }
    connect(host_, &QLineEdit::editingFinished, this, changed);
    connect(serialPort_, &QLineEdit::editingFinished, this, changed);
    connect(serialScan_, &QPushButton::clicked, this, [this] {
        busy_ = true;
        updateControls();
        showStatus(text("正在扫描本机串口，请从列表中选择你的 ESP32。"));
        send(QStringLiteral("ports"));
    });
    connect(transport_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] { updateControls(); });
    connect(circuitPalette_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] {
        const auto* item = gallery_->currentItem();
        if (item) preferences().setValue(QStringLiteral("paletteSelection/") + item->data(Qt::UserRole).toString(),
            circuitPalette_->currentData().toString());
    });
    connect(gallery_, &QListWidget::currentItemChanged, this, [this, changed](QListWidgetItem* current, QListWidgetItem*) {
        if (current) {
            const QString mode = current->data(Qt::UserRole).toString();
            const QString palette = preferences().value(QStringLiteral("paletteSelection/") + mode,
                QStringLiteral("ice")).toString();
            const int index = circuitPalette_->findData(palette);
            if (index >= 0) {
                const bool blocked = circuitPalette_->blockSignals(true);
                circuitPalette_->setCurrentIndex(index);
                circuitPalette_->blockSignals(blocked);
            }
        }
        updateControls();
        changed();
    });
    connect(cad_, &QCheckBox::toggled, this, [this] { savePreferences(); });
    connect(autoStart_, &QCheckBox::toggled, this, [this] { savePreferences(); });
    connect(language_, qOverload<int>(&QComboBox::currentIndexChanged), this, [this] {
        retranslateUi();
        savePreferences();
    });
    connect(start_, &QPushButton::clicked, this, [this] {
        if (!ready_ || busy_) return;
        if (width_->value() * height_->value() > 4096) {
            showStatus(text("像素总数不能超过 4096。"), true);
            return;
        }
        debounce_->stop();
        updatePreview();
        savePreferences();
        busy_ = true;
        updateControls();
        showStatus(transport_->currentData().toString() == QStringLiteral("usb")
            ? text("正在打开 USB 有线通道；首次连接约需 3 秒。")
            : text("正在准备 DDP 播放；不会抢占网页版正在发送的同一块屏幕。"));
        send(QStringLiteral("start"), configuration());
    });
    connect(stop_, &QPushButton::clicked, this, [this] {
        busy_ = true;
        updateControls();
        showStatus(text("正在停止本插件的播放会话。"));
        send(QStringLiteral("stop"));
    });
    connect(deviceSize_, &QPushButton::clicked, this, [this] {
        busy_ = true;
        updateControls();
        showStatus(text("正在读取 WLED 矩阵尺寸，不修改设备配置。"));
        send(QStringLiteral("device"), QJsonObject{{QStringLiteral("host"), host_->text().trimmed()}});
    });

    helper_ = new QProcess(this);
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
            showStatus(text("动画进程已退出。可重新加载动画库；未自动重连或发送。 (%1/%2)"),
                true, {QString::number(exitCode), QString::number(static_cast<int>(exitStatus))});
        }
    });
    heartbeat_ = new QTimer(this);
    heartbeat_->setInterval(2000);
    connect(heartbeat_, &QTimer::timeout, this, [this] { send(QStringLiteral("ping")); });
    connect(helper_, &QProcess::started, this, [this] { heartbeat_->start(); });
    updateControls();
    setLabelText(dimensions_, text("实时画面 · %1 x %2  |  %3 PX"),
        {QString::number(width_->value()), QString::number(height_->value()), QString::number(width_->value() * height_->value())});
    languageUiReady_ = true;
    retranslateUi();
    // The panel is inserted into the host tab widget after construction.
    QTimer::singleShot(0, this, [this] {
        retranslateUi();
        auto* hostWindow = window();
        if (hostWindow == this) return;
        auto* screen = QApplication::screenAt(hostWindow->frameGeometry().center());
        if (!screen) screen = QApplication::primaryScreen();
        if (!screen) return;
        const QRect desktop = screen->availableGeometry();
        const int decoration = qMax(0, hostWindow->frameGeometry().height() - hostWindow->height());
        const int hostChrome = qMax(0, hostWindow->height() - height());
        const int maximumPanelHeight = qMax(120, desktop.height() - decoration - hostChrome - 24);
        // Reserve roughly 330 logical pixels for the screen/library, plus
        // the actual font-dependent height of the visible controls.
        const int controlsHeight = qMax(0, layout()->minimumSize().height() - 120);
        const int desiredPanelHeight = qMin(controlsHeight + 330, maximumPanelHeight);
        setMinimumHeight(desiredPanelHeight);
        if (!hostWindow->isMaximized() && !hostWindow->isFullScreen()) {
            hostWindow->resize(hostWindow->width(), qMax(hostWindow->height(), desiredPanelHeight + hostChrome));
            const QRect frame = hostWindow->frameGeometry();
            if (frame.bottom() > desktop.bottom())
                hostWindow->move(hostWindow->pos() + QPoint(0, desktop.bottom() - frame.bottom()));
        }
    });
    QTimer::singleShot(0, this, [this] { boot(); });
}

PixelStudioPanel::~PixelStudioPanel() { shutdown(); }

void PixelStudioPanel::boot() {
    if (busy_ || streaming_) {
        showStatus(text("请先停止本插件的播放，再重新加载动画库。"), true);
        return;
    }
    if (helper_->state() != QProcess::NotRunning) shutdown();
    closing_ = false;
    ready_ = false;
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

void PixelStudioPanel::send(const QString& operation, const QJsonObject& data) {
    if (!helper_ || helper_->state() != QProcess::Running) return;
    if (helper_->bytesToWrite() > 65536) {
        showStatus(text("本地动画进程暂时繁忙，请等待后重试。"), true);
        return;
    }
    const QJsonObject message{{QStringLiteral("id"), ++sequence_},
                              {QStringLiteral("op"), operation},
                              {QStringLiteral("data"), data}};
    helper_->write(QJsonDocument(message).toJson(QJsonDocument::Compact) + '\n');
}
void PixelStudioPanel::consumeOutput() {
    input_ += helper_->readAllStandardOutput();
    if (input_.size() > 2 * 1024 * 1024) {
        input_.clear();
        showStatus(text("本地动画输出超过缓冲区限制。"), true);
        return;
    }
    int end = -1;
    while ((end = input_.indexOf('\n')) >= 0) {
        const auto line = input_.left(end);
        input_.remove(0, end + 1);
        const auto document = QJsonDocument::fromJson(line);
        if (document.isObject() && !closing_) handleMessage(document.object());
    }
}

void PixelStudioPanel::handleMessage(const QJsonObject& message) {
    const auto type = message.value(QStringLiteral("type")).toString();
    if (type == QStringLiteral("ready")) {
        const QSignalBlocker galleryBlock(gallery_);
        const QSignalBlocker mappingBlock(mapping_);
        gallery_->clear();
        cards_.clear();
        for (const auto value : message.value(QStringLiteral("modes")).toArray()) {
            const auto mode = value.toObject();
            const auto id = mode.value(QStringLiteral("id")).toString();
            auto* item = new QListWidgetItem(mode.value(QStringLiteral("title")).toString(), gallery_);
            item->setData(Qt::UserRole, id);
            item->setData(Qt::UserRole + 10, item->text());
            item->setData(Qt::UserRole + 1, categoryForMode(id));
            item->setData(Qt::UserRole + 2, favoriteModes_.contains(id));
            item->setTextAlignment(Qt::AlignHCenter);
            item->setToolTip(item->text() + QStringLiteral("\n") + id);
            cards_.insert(id, item);
        }
        mapping_->clear();
        for (const auto value : message.value(QStringLiteral("mappings")).toArray()) {
            const auto option = value.toObject();
            mapping_->addItem(option.value(QStringLiteral("title")).toString(), option.value(QStringLiteral("value")).toString());
        }
        const auto defaultMap = message.value(QStringLiteral("config")).toObject().value(QStringLiteral("mapping")).toString();
        auto preferredMap = mapping_->property("preferred").toString();
        if (preferredMap.isEmpty()) preferredMap = defaultMap;
        int mapIndex = mapping_->findData(preferredMap);
        if (mapIndex < 0) mapIndex = mapping_->findData(defaultMap);
        mapping_->setCurrentIndex(qMax(0, mapIndex));
        auto* selected = cards_.value(savedMode_, nullptr);
        if (!selected && gallery_->count()) selected = gallery_->item(0);
        gallery_->setCurrentItem(selected);
        retranslateUi();
        ready_ = true;
        updateControls();
        updatePreview();
        if (autoStart_->isChecked()) {
            busy_ = true;
            updateControls();
            showStatus(text("已加载动画库，正在按保存的设置自动开始播放。"));
            send(QStringLiteral("start"), configuration());
        } else {
            showStatus(text("已加载 %1 种共享动画。点击开始才会向 WLED 发送。"), false, {QString::number(gallery_->count())});
        }
    } else if (type == QStringLiteral("frame")) {
        const int w = message.value(QStringLiteral("w")).toInt();
        const int h = message.value(QStringLiteral("h")).toInt();
        if (w == width_->value() && h == height_->value()
            && message.value(QStringLiteral("revision")).toInt() >= previewSequence_) {
            if (!streaming_) outputBoard_->setFrame(w, h, QByteArray::fromBase64(message.value(QStringLiteral("rgb")).toString().toLatin1()));
        }
    } else if (type == QStringLiteral("outputFrame")) {
        const int w = message.value(QStringLiteral("w")).toInt();
        const int h = message.value(QStringLiteral("h")).toInt();
        const QByteArray rgb = QByteArray::fromBase64(message.value(QStringLiteral("rgb")).toString().toLatin1());
        if (rgb.size() == w * h * 3) outputBoard_->setFrame(w, h, rgb);
        const QString transport = message.value(QStringLiteral("transport")).toString() == QStringLiteral("usb")
            ? text("USB 有线") : text("DDP 网络");
        setLabelText(outputTitle_, text("实时输出 · %1"), {transport});
    } else if (type == QStringLiteral("thumbnail")) {
        auto* item = cards_.value(message.value(QStringLiteral("mode")).toString(), nullptr);
        if (!item) return;
        const auto rgb = QByteArray::fromBase64(message.value(QStringLiteral("rgb")).toString().toLatin1());
        const auto image = rgbImage(message.value(QStringLiteral("w")).toInt(), message.value(QStringLiteral("h")).toInt(), rgb);
        if (!image.isNull()) item->setIcon(QIcon(QPixmap::fromImage(image).scaled(45, 81, Qt::KeepAspectRatio, Qt::FastTransformation)));
    } else if (type == QStringLiteral("state")) {
        streaming_ = message.value(QStringLiteral("streaming")).toBool();
        if (!streaming_) {
            setLabelText(stats_, text("当前未发送"));
            setLabelText(outputTitle_, text("实时输出 · 已停止"));
        } else {
            setLabelText(outputTitle_, text("实时输出 · 正在连接"));
        }
        updateControls();
    } else if (type == QStringLiteral("stats")) {
        const auto stats = message.value(QStringLiteral("stats")).isObject()
            ? message.value(QStringLiteral("stats")).toObject() : message;
        setLabelText(stats_, text("发送 %1 / %2 FPS  |  %3 kbps"),
            {QString::number(stats.value(QStringLiteral("fps")).toDouble(), 'f', 1),
             QString::number(stats.value(QStringLiteral("targetFps")).toInt(fps_->value())),
             QString::number(stats.value(QStringLiteral("kbps")).toDouble() * 1024.0 * 8.0 / 1000.0, 'f', 1)});
    } else if (type == QStringLiteral("device")) {
        width_->setValue(message.value(QStringLiteral("w")).toInt(15));
        height_->setValue(message.value(QStringLiteral("h")).toInt(27));
        showStatus(text("已读取实际矩阵尺寸。只是更新面板输入，没有修改 WLED 配置。"));
    } else if (type == QStringLiteral("ports")) {
        const auto ports = message.value(QStringLiteral("ports")).toArray();
        QStringList labels;
        QStringList ids;
        for (const auto& value : ports) {
            const auto port = value.toObject();
            const QString id = port.value(QStringLiteral("id")).toString();
            const QString name = port.value(QStringLiteral("name")).toString();
            if (!id.isEmpty()) { ids.append(id); labels.append(id + QStringLiteral("  ·  ") + name); }
        }
        if (labels.isEmpty()) {
            showStatus(text("未发现串口。请连接 ESP32 后重新扫描。"), true);
        } else {
            bool accepted = false;
            const QString selected = QInputDialog::getItem(this, localized(text("选择 USB 串口")),
                localized(text("请选择当前连接的 ESP32：")), labels, 0, false, &accepted);
            if (accepted) {
                const int index = labels.indexOf(selected);
                if (index >= 0) serialPort_->setText(ids.at(index));
                showStatus(text("已选择 %1；端口只保存在本机。"), false, {serialPort_->text()});
            }
        }
    } else if (type == QStringLiteral("result")) {
        const auto operation = message.value(QStringLiteral("op")).toString();
        if (operation == QStringLiteral("start") || operation == QStringLiteral("stop") || operation == QStringLiteral("device") || operation == QStringLiteral("ports")) {
            busy_ = false;
            updateControls();
        }
        if (operation == QStringLiteral("start") && streaming_)
            showStatus(transport_->currentData().toString() == QStringLiteral("usb")
                ? text("USB 有线后台正在播放。手绘姿态与光效会持续更新。")
                : text("DDP 后台正在播放。切换动画、速度、配色或亮度会无缝应用。"));
        if (operation == QStringLiteral("stop"))
            showStatus(text("本插件的播放已停止。独立网页版和共享服务保留运行。"));
    } else if (type == QStringLiteral("colorProfile")) {
        const QSignalBlocker blocker(gamma_);
        if (message.value(QStringLiteral("automatic")).toBool())
            gamma_->setValue(message.value(QStringLiteral("gamma")).toDouble(1.0));
        gamma_->setEnabled(false);
    } else if (type == QStringLiteral("error") || type == QStringLiteral("fatal") || type == QStringLiteral("warning")) {
        const auto operation = message.value(QStringLiteral("op")).toString();
        if (operation == QStringLiteral("start") || operation == QStringLiteral("stop")
            || operation == QStringLiteral("device") || operation == QStringLiteral("ports") || type == QStringLiteral("fatal")) busy_ = false;
        if (type == QStringLiteral("fatal")) ready_ = false;
        const QString detail = message.value(QStringLiteral("message")).toString();
        // OS exception text follows the Windows language, not the panel language.
        // Classify serial-open failures before passing them to the UI translator.
        if (detail.contains(QStringLiteral("could not open port"), Qt::CaseInsensitive)) {
            const QString port = serialPort_->text().trimmed();
            if (detail.contains(QStringLiteral("FileNotFoundError")) || detail.contains(QStringLiteral("[Errno 2]"))) {
                showStatus(text("串口 %1 不存在。请连接设备并重新选择串口。"), true, {port});
            } else if (detail.contains(QStringLiteral("PermissionError")) || detail.contains(QStringLiteral("[Errno 13]"))) {
                showStatus(text("无法访问串口 %1。它可能正被其他程序占用，或访问权限不足。"), true, {port});
            } else {
                showStatus(text("无法打开串口 %1。请检查设备连接和串口设置。"), true, {port});
            }
        } else {
            showStatus(detail, true);
        }
        updateControls();
    }
}

QJsonObject PixelStudioPanel::configuration() const {
    const auto* selected = gallery_->currentItem();
    const QString mode = selected ? selected->data(Qt::UserRole).toString() : QString();
    const bool animationPalette = mode == QStringLiteral("pocket_circuit")
        || mode == QStringLiteral("wave") || mode == QStringLiteral("portrait_portal")
        || mode == QStringLiteral("pocket_starwhale") || mode == QStringLiteral("ripples")
        || mode == QStringLiteral("waterfall") || mode.startsWith(QStringLiteral("scene_"));
    const QString palette = animationPalette ? circuitPalette_->currentData().toString()
        : clockPalette_->currentData().toString();
    return QJsonObject{
        {QStringLiteral("mode"), selected ? selected->data(Qt::UserRole).toString() : QString()},
        {QStringLiteral("w"), width_->value()}, {QStringLiteral("h"), height_->value()},
        {QStringLiteral("brightness"), brightness_->value()}, {QStringLiteral("fps"), fps_->value()},
        {QStringLiteral("speed"), speed_->value()}, {QStringLiteral("mapping"), mapping_->currentData().toString()},
        {QStringLiteral("clockFont"), clockFont_->currentData().toString()},
        {QStringLiteral("clockPalette"), palette == QStringLiteral("custom")
            ? preferences().value(QStringLiteral("customPalette/") + mode,
                mode == QStringLiteral("clock") ? customClockPalette_
                    : QStringLiteral("custom:#e5f5ff:#6ad3f5:#356e88")).toString()
            : palette},
        {QStringLiteral("transport"), transport_->currentData().toString()},
        {QStringLiteral("serialPort"), serialPort_->text().trimmed()},
        {QStringLiteral("host"), host_->text().trimmed()},
        {QStringLiteral("match"), colorMatching_->currentData().toBool()},
        {QStringLiteral("gamma"), gamma_->value()}
    };
}
void PixelStudioPanel::updatePreview() {
    setLabelText(dimensions_, text("实时画面 · %1 x %2  |  %3 PX"),
        {QString::number(width_->value()), QString::number(height_->value()), QString::number(width_->value() * height_->value())});
    if (!ready_ || !gallery_->currentItem()) return;
    if (width_->value() * height_->value() > 4096) {
        showStatus(text("像素总数不能超过 4096。"), true);
        return;
    }
    previewSequence_ = sequence_ + 1;
    if (streaming_ && !busy_) {
        busy_ = true;
        updateControls();
        showStatus(text("正在无缝更新当前播放，不中断输出。"));
        send(QStringLiteral("start"), configuration());
    } else {
        send(QStringLiteral("configure"), configuration());
    }
    savePreferences();
}
void PixelStudioPanel::updateControls() {
    if (clockColorControls_) {
        const auto* item = gallery_->currentItem();
        const QString mode = item ? item->data(Qt::UserRole).toString() : QString();
        const bool clockSelected = mode == QStringLiteral("clock");
        const bool circuitSelected = mode == QStringLiteral("pocket_circuit");
        const bool paletteSelected = circuitSelected || mode == QStringLiteral("wave")
            || mode == QStringLiteral("portrait_portal") || mode == QStringLiteral("pocket_starwhale")
            || mode == QStringLiteral("ripples") || mode == QStringLiteral("waterfall") || mode.startsWith(QStringLiteral("scene_"));
        arrangeLiveControls(clockSelected, paletteSelected);
        clockColorLabel_->setVisible(clockSelected || paletteSelected);
        clockColorControls_->setVisible(clockSelected || paletteSelected);
        clockPalette_->setVisible(clockSelected);
        customColorsButton_->setVisible(clockSelected);
        animationColorsButton_->setVisible(paletteSelected);
        circuitPalette_->setVisible(paletteSelected);
    }
    if (randomTimer_ && randomPlayback_) {
        randomDuration_->setEnabled(randomPlayback_->isChecked());
        if (streaming_ && randomPlayback_->isChecked() && !closing_) {
            if (!randomTimer_->isActive()) randomTimer_->start();
        } else {
            randomTimer_->stop();
        }
    }
    load_->setEnabled(!busy_ && !streaming_);
    projectPath_->setEnabled(!busy_ && !streaming_);
    nodePath_->setEnabled(!busy_ && !streaming_);
    start_->setEnabled(ready_ && !busy_ && gallery_->currentItem());
    stop_->setEnabled(ready_ && (busy_ || streaming_));
    // Mutually exclusive controls occupy the same position in the action row.
    const bool showStop = streaming_ || busy_;
    start_->setVisible(!showStop);
    stop_->setVisible(showStop);
    outputBoard_->setPlaying(streaming_);
    deviceSize_->setEnabled(ready_ && !busy_ && !streaming_);
    const bool usb = transport_->currentData().toString() == QStringLiteral("usb");
    transport_->setEnabled(!busy_ && !streaming_);
    host_->setEnabled(!usb && !busy_ && !streaming_);
    serialPort_->setEnabled(usb && !busy_ && !streaming_);
    serialScan_->setEnabled(usb && !busy_ && !streaming_);
    deviceSize_->setEnabled(!usb && ready_ && !busy_ && !streaming_);
    const bool clockSelected = gallery_->currentItem()
        && gallery_->currentItem()->data(Qt::UserRole).toString() == QStringLiteral("clock");
    clockLabel_->setVisible(clockSelected);
    clockControls_->setVisible(clockSelected);
}
void PixelStudioPanel::showStatus(const QString& message, bool error, const QStringList& arguments) {
    setLabelText(status_, message, arguments);
    status_->setToolTip(status_->text());
    status_->setVisible(error);
    start_->setToolTip(status_->text());
    stop_->setToolTip(status_->text());
    status_->setStyleSheet(error ? QStringLiteral("color:#e48b65;") : QString());
}
void PixelStudioPanel::savePreferences() {
    auto settings = preferences();
    settings.setValue(QStringLiteral("language"), language_->currentData());
    settings.setValue(QStringLiteral("project"), projectPath_->text().trimmed());
    settings.setValue(QStringLiteral("node"), nodePath_->text().trimmed());
    settings.setValue(QStringLiteral("host"), host_->text().trimmed());
    settings.setValue(QStringLiteral("transport"), transport_->currentData());
    settings.setValue(QStringLiteral("serialPort"), serialPort_->text().trimmed());
    settings.setValue(QStringLiteral("width"), width_->value());
    settings.setValue(QStringLiteral("height"), height_->value());
    settings.setValue(QStringLiteral("brightness"), brightness_->value());
    settings.setValue(QStringLiteral("fps"), fps_->value());
    settings.setValue(QStringLiteral("colorMatching"), colorMatching_->currentData().toBool());
    settings.setValue(QStringLiteral("gamma"), gamma_->value());
    settings.setValue(QStringLiteral("speed"), speed_->value());
    settings.setValue(QStringLiteral("clockFont"), clockFont_->currentData());
    settings.setValue(QStringLiteral("clockPalette"), clockPalette_->currentData());
    settings.setValue(QStringLiteral("circuitPalette"), circuitPalette_->currentData());
    settings.setValue(QStringLiteral("favorites"), QStringList(favoriteModes_.begin(), favoriteModes_.end()));
    settings.setValue(QStringLiteral("randomDuration"), randomDuration_->value());
    settings.setValue(QStringLiteral("customClockPalette"), customClockPalette_);
    settings.setValue(QStringLiteral("cad"), cad_->isChecked());
    settings.setValue(QStringLiteral("autoStart"), autoStart_->isChecked());
    if (gallery_->currentItem()) {
        savedMode_ = gallery_->currentItem()->data(Qt::UserRole).toString();
        settings.setValue(QStringLiteral("mode"), savedMode_);
    }
    if (mapping_->currentIndex() >= 0) {
        settings.setValue(QStringLiteral("mapping"), mapping_->currentData());
        mapping_->setProperty("preferred", mapping_->currentData());
    }
}
void PixelStudioPanel::applyTheme() {
    const QString key = theme_->currentData().toString();
    QColor accent("#8ee6ba"), border("#304b3b"), selected("#284b3a"), background("#0b1510"), idle("#425b51");
    if (key == QStringLiteral("amber")) {
        accent = QColor("#ffbd75"); border = QColor("#64503a"); selected = QColor("#59432d");
        background = QColor("#19130d"); idle = QColor("#695743");
    } else if (key == QStringLiteral("ice")) {
        accent = QColor("#83d5f2"); border = QColor("#345567"); selected = QColor("#294c5d");
        background = QColor("#0c161d"); idle = QColor("#425d6b");
    } else if (key == QStringLiteral("rose")) {
        accent = QColor("#efabc6"); border = QColor("#654453"); selected = QColor("#553444");
        background = QColor("#1b1118"); idle = QColor("#68515d");
    }
    outputBoard_->setThemeColors(accent, idle);
    if (auto* logo = findChild<QLabel*>(QStringLiteral("PixelStudioBrandLogo"))) {
        const qreal dpr = devicePixelRatioF();
        QImage image = pixelStudioLogo(qRound(38 * dpr), accent, background);
        image.setDevicePixelRatio(dpr);
        logo->setPixmap(QPixmap::fromImage(image));
        logo->setObjectName(QStringLiteral("PixelStudioBrandLogo"));
    }
    gallery_->setProperty("studioAccent", accent);
    gallery_->setProperty("studioBorder", border);
    gallery_->setProperty("studioSelected", selected);
    gallery_->setProperty("studioBackground", background);
    gallery_->setStyleSheet(QStringLiteral("QListWidget { background:%1; border:1px solid %2; border-radius:8px; }").arg(background.name(), border.name()));
    if (!property("studioBaseStyle").isValid()) setProperty("studioBaseStyle", styleSheet());
    setStyleSheet(property("studioBaseStyle").toString() + QStringLiteral(
        " QWidget#PixelStudioPanel QGroupBox { border-color:%1; }"
        " QWidget#PixelStudioPanel QSlider::sub-page:horizontal { background:%2; }").arg(border.name(), accent.name()));
    start_->setStyleSheet(QStringLiteral(
        "QPushButton { background:%1; border:1px solid %1; border-radius:6px; padding:0; }"
        "QPushButton:hover { background:%2; }"
        "QPushButton:pressed { background:%3; }"
        "QPushButton:disabled { background:%4; border-color:%4; }")
        .arg(accent.name(), accent.lighter(110).name(), accent.darker(115).name(), idle.name()));
    gallery_->viewport()->update();
}
void PixelStudioPanel::arrangeLiveControls(bool clockSelected, bool paletteSelected) {
    if (!liveLayout_) return;
    const int layoutMode = clockSelected ? 1 : paletteSelected ? 2 : 0;
    if (liveLayout_->property("layoutMode").isValid()
        && liveLayout_->property("layoutMode").toInt() == layoutMode) return;
    liveLayout_->setProperty("layoutMode", layoutMode);
    while (auto* item = liveLayout_->takeAt(0)) delete item;
    for (QWidget* widget : {static_cast<QWidget*>(clockLabel_), clockControls_,
                           static_cast<QWidget*>(clockColorLabel_), clockColorControls_}) {
        auto policy = widget->sizePolicy();
        policy.setRetainSizeWhenHidden(false);
        widget->setSizePolicy(policy);
        widget->setVisible(clockSelected || paletteSelected);
    }
    animationColorsButton_->setVisible(paletteSelected);
    liveLayout_->addWidget(brightnessLabel_, 0, 0, Qt::AlignVCenter);
    if (clockSelected || paletteSelected) {
        liveLayout_->addWidget(brightnessControls_, 0, 1, Qt::AlignVCenter);
        liveLayout_->addWidget(speedLabel_, 0, 2, Qt::AlignVCenter);
        liveLayout_->addWidget(speedControls_, 0, 3, Qt::AlignVCenter);
        if (clockSelected) {
            liveLayout_->addWidget(clockLabel_, 1, 0, Qt::AlignVCenter);
            liveLayout_->addWidget(clockControls_, 1, 1, Qt::AlignVCenter);
            liveLayout_->addWidget(clockColorLabel_, 1, 2, Qt::AlignVCenter);
            liveLayout_->addWidget(clockColorControls_, 1, 3, Qt::AlignVCenter);
        } else {
            clockLabel_->hide();
            clockControls_->hide();
            liveLayout_->addWidget(clockColorLabel_, 1, 0, Qt::AlignVCenter);
            liveLayout_->addWidget(clockColorControls_, 1, 1, Qt::AlignVCenter);
            liveLayout_->addWidget(animationColorsButton_, 1, 2, 1, 2, Qt::AlignVCenter);
        }
    } else {
        customColorsButton_->hide();
        animationColorsButton_->hide();
        liveLayout_->addWidget(brightnessControls_, 0, 1, 1, 3, Qt::AlignVCenter);
        liveLayout_->addWidget(speedLabel_, 1, 0, Qt::AlignVCenter);
        liveLayout_->addWidget(speedControls_, 1, 1, 1, 3, Qt::AlignVCenter);
    }
    liveLayout_->setContentsMargins(16, 16, 16, 16);
    liveLayout_->setRowMinimumHeight(0, 30);
    liveLayout_->setRowMinimumHeight(1, 30);
    // Identical row metrics for the plain, clock and palette arrangements.
    for (QWidget* widget : {brightnessLabel_, brightnessControls_, speedLabel_, speedControls_,
                           static_cast<QWidget*>(clockLabel_), clockControls_,
                           static_cast<QWidget*>(clockColorLabel_), clockColorControls_}) {
        widget->setFixedHeight(30);
    }
    const int labelWidth = qMax(qMax(brightnessLabel_->sizeHint().width(), speedLabel_->sizeHint().width()),
        qMax(clockLabel_->fontMetrics().horizontalAdvance(clockLabel_->text()),
             clockColorLabel_->fontMetrics().horizontalAdvance(clockColorLabel_->text()))) + 8;
    liveLayout_->setColumnMinimumWidth(0, labelWidth);
    liveLayout_->setColumnMinimumWidth(2, labelWidth);
    for (auto* combo : {clockFont_, clockPalette_, circuitPalette_}) combo->setFixedHeight(30);
    liveLayout_->setAlignment(Qt::AlignTop);
    liveLayout_->setVerticalSpacing(8);
    for (QWidget* container : {brightnessControls_, speedControls_, clockControls_, clockColorControls_}) {
        if (container->layout()) {
            container->layout()->setContentsMargins(0, 0, 0, 0);
            container->layout()->setAlignment(Qt::AlignVCenter);
        }
    }
    customColorsButton_->setFixedHeight(30);
    animationColorsButton_->setFixedHeight(30);
    liveLayout_->setRowStretch(0, 0);
    liveLayout_->setRowStretch(1, 0);
}
void PixelStudioPanel::advanceRandomAnimation() {
    if (!randomPlayback_->isChecked() || !streaming_ || !ready_ || busy_ || closing_) return;
    QList<QListWidgetItem*> candidates;
    for (int i = 0; i < gallery_->count(); ++i) {
        auto* item = gallery_->item(i);
        if (!item->isHidden() && item != gallery_->currentItem()) candidates.append(item);
    }
    if (!candidates.isEmpty()) gallery_->setCurrentItem(candidates.at(QRandomGenerator::global()->bounded(candidates.size())));
}
QString PixelStudioPanel::localized(const QString& source) const {
    return english_ ? PixelStudioI18n::english(source) : source;
}
void PixelStudioPanel::setLabelText(QLabel* label, const QString& source, const QStringList& arguments) {
    label->setProperty("pixelStudioSource_text", source);
    label->setProperty("pixelStudioTextArguments", arguments);
    QString translated = localized(source);
    for (const auto& argument : arguments) translated = translated.arg(localized(argument));
    label->setText(translated);
}
void PixelStudioPanel::retranslateUi() {
    if (!languageUiReady_) return;
    const auto choice = language_->currentData().toString();
    english_ = choice == QStringLiteral("en")
        || (choice == QStringLiteral("auto") && !hostInterfaceUsesChinese(this));
    // Retain the original source text, so switching back never translates translations.
    const auto property = [this](QObject* object, const char* name) {
        const QByteArray key = QByteArray("pixelStudioSource_") + name;
        if (!object->property(key.constData()).isValid())
            object->setProperty(key.constData(), object->property(name));
        QString translated = localized(object->property(key.constData()).toString());
        if (QByteArray(name) == "text") {
            for (const auto& argument : object->property("pixelStudioTextArguments").toStringList())
                translated = translated.arg(localized(argument));
        }
        object->setProperty(name, translated);
    };
    for (auto* widget : findChildren<QWidget*>()) {
        if (qobject_cast<QDialog*>(widget)) property(widget, "windowTitle");
        if (qobject_cast<QLabel*>(widget) || qobject_cast<QAbstractButton*>(widget)) property(widget, "text");
        if (qobject_cast<QGroupBox*>(widget)) property(widget, "title");
        if (qobject_cast<QLineEdit*>(widget)) property(widget, "placeholderText");
        property(widget, "toolTip");
        property(widget, "accessibleName");
        if (auto* combo = qobject_cast<QComboBox*>(widget)) {
            const QSignalBlocker blocker(combo);
            for (int i = 0; i < combo->count(); ++i) {
                if (!combo->itemData(i, Qt::UserRole + 10).isValid())
                    combo->setItemData(i, combo->itemText(i), Qt::UserRole + 10);
                combo->setItemText(i, localized(combo->itemData(i, Qt::UserRole + 10).toString()));
                if (combo == language_) combo->setItemData(i, int(Qt::AlignCenter), Qt::TextAlignmentRole);
            }
        }
    }
    const QSignalBlocker blocker(gallery_);
    for (int i = 0; i < gallery_->count(); ++i) {
        auto* item = gallery_->item(i);
        item->setText(localized(item->data(Qt::UserRole + 10).toString()));
        item->setToolTip(item->text());
    }
    static_cast<AnimationGallery*>(gallery_)->fitCards();
    host_->setMinimumWidth(host_->fontMetrics().horizontalAdvance(QStringLiteral("255.255.255.255")) + 24);
    gallery_->doItemsLayout();
    for (auto* edit : findChildren<QLineEdit*>()) centerEditorInk(edit);
    randomDuration_->setSuffix(english_ ? QStringLiteral(" s") : QStringLiteral(" 秒"));
    filterGallery();
}
void PixelStudioPanel::filterGallery() {
    const auto query = search_->text().trimmed();
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
}
bool PixelStudioPanel::eventFilter(QObject* watched, QEvent* event) {
    if (gallery_ && watched == gallery_->viewport() && event->type() == QEvent::MouseButtonPress) {
        auto* mouse = static_cast<QMouseEvent*>(event);
        if (mouse->button() == Qt::LeftButton) {
            auto* item = gallery_->itemAt(mouse->pos());
            if (item) {
                const int cellWidth = gallery_->gridSize().width();
                const int remainder = cellWidth > 0 ? gallery_->viewport()->width() % cellWidth : 0;
                const QRect card = gallery_->visualItemRect(item).adjusted(4, 4, -4, -4).translated(remainder / 2, 0);
                const QRect heart(card.right() - 28, card.top() + 4, 24, 24);
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
void PixelStudioPanel::changeEvent(QEvent* event) {
    QWidget::changeEvent(event);
    if (event->type() == QEvent::LanguageChange && languageUiReady_
        && language_->currentData().toString() == QStringLiteral("auto")) {
        QTimer::singleShot(0, this, [this] { retranslateUi(); });
    }
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

