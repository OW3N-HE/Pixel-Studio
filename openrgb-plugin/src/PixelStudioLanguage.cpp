#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include <QAbstractButton>
#include <QDialog>
#include <QGroupBox>
#include <QGridLayout>
#include <QSignalBlocker>
#include <QTimer>

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
            combo->setSizeAdjustPolicy(QComboBox::AdjustToContents);
            for (int i = 0; i < combo->count(); ++i) {
                if (!combo->itemData(i, Qt::UserRole + 10).isValid())
                    combo->setItemData(i, combo->itemText(i), Qt::UserRole + 10);
                combo->setItemText(i, localized(combo->itemData(i, Qt::UserRole + 10).toString()));
                if (combo == language_) combo->setItemData(i, int(Qt::AlignCenter), Qt::TextAlignmentRole);
            }
            combo->updateGeometry();
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
    if (liveLayout_) { liveLayout_->setProperty("layoutMode", -1); updateControls(); }
}
void PixelStudioPanel::changeEvent(QEvent* event) {
    QWidget::changeEvent(event);
    if (event->type() == QEvent::LanguageChange && languageUiReady_
        && language_->currentData().toString() == QStringLiteral("auto")) {
        QTimer::singleShot(0, this, [this] { retranslateUi(); });
    }
}
