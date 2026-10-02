#include "PixelStudioPanel.h"
#include "PixelStudioWidgets.h"
#include "PixelStudioSupport.h"
#include <QGridLayout>
#include <QVBoxLayout>
using namespace PixelStudioUi;
using namespace PixelStudioSupport;

#include <QColorDialog>
#include <QDialog>
#include <QSignalBlocker>
#include <QTimer>

void PixelStudioPanel::editThermalColors() {
    const auto* item = gallery_->currentItem();
    if (!item) return;
    const QString mode = item->data(Qt::UserRole).toString();
    const bool thermal = mode.startsWith(QStringLiteral("thermal_"));
    const bool clock = mode == QStringLiteral("clock");
    auto paletteSettings = preferences();
    auto* paletteCombo = clock ? clockPalette_ : circuitPalette_;
    const QString selected = paletteCombo->currentData().toString();
    QString preset = selected == QStringLiteral("custom")
        ? paletteSettings.value(QStringLiteral("presetPalette/") + mode,
            clock ? QStringLiteral("mint") : QStringLiteral("original")).toString() : selected;
    if (preset == QStringLiteral("custom") || paletteCombo->findData(preset) < 0)
        preset = clock ? QStringLiteral("mint") : QStringLiteral("original");
    QDialog dialog(this);
    dialog.setFont(font());
    dialog.setWindowTitle(localized(text("自定义配色")));
    const QColor accent = gallery_->property("studioAccent").value<QColor>();
    const QColor background = gallery_->property("studioBackground").value<QColor>();
    const QColor border = gallery_->property("studioBorder").value<QColor>();
    dialog.setStyleSheet(QStringLiteral(
        "QDialog { background:%1; color:#f0f5f8; } QLabel,QCheckBox { color:#f0f5f8; }"
        "QPushButton { background:%1; color:#f0f5f8; border:1px solid %2; border-radius:6px; min-height:30px; padding:0 10px; }"
        "QPushButton:hover { border-color:%3; }").arg(background.name(), border.name(), accent.name()));
    auto* layout = new QVBoxLayout(&dialog);
    layout->setSpacing(12);
    auto* enabled = new StudioCheckBox(localized(text("启用自定义配色")), &dialog);
    enabled->setChecked(thermal ? thermalPreferences_.value(QStringLiteral("custom")).toBool() : selected == QStringLiteral("custom"));
    layout->addWidget(enabled);
    auto* note = new StudioLabel(localized(thermal ? text("关闭后使用品牌配色，已保存的自定义颜色会保留。")
        : text("关闭后使用预设配色，已保存的自定义颜色会保留。")), &dialog);
    note->setWordWrap(true);
    layout->addWidget(note);
    const QColor cpu = thermalCpu_->currentData().toString() == QStringLiteral("intel") ? QColor("#299bff") : QColor("#ff514b");
    const QString gpuBrand = thermalGpu_->currentData().toString();
    const QColor gpu = gpuBrand == QStringLiteral("amd") ? QColor("#ff514b") : gpuBrand == QStringLiteral("intel") ? QColor("#299bff") : QColor("#44ff53");
    const QColor divider(qRound(gpu.red() * 0.3), qRound(gpu.green() * 0.3), qRound(gpu.blue() * 0.3));
    QList<QColor> defaults{cpu, gpu, divider};
    if (!thermal) {
        defaults = {QColor("#e5f5ff"), QColor("#6ad3f5"), QColor("#356e88")};
        if (preset == QStringLiteral("mint")) defaults = {QColor("#f2ebd6"), QColor("#8af2c9"), QColor("#397660")};
        if (preset == QStringLiteral("amber")) defaults = {QColor("#ffe2ab"), QColor("#ffad59"), QColor("#925628")};
        if (preset == QStringLiteral("rose")) defaults = {QColor("#fff0f5"), QColor("#ff9ec3"), QColor("#9e4d72")};
        if (preset == QStringLiteral("violet")) defaults = {QColor("#f5efff"), QColor("#be97ff"), QColor("#67508e")};
    }
    const QStringList keys{QStringLiteral("cpu"), QStringLiteral("gpu"), QStringLiteral("divider")};
    const QStringList captions = thermal
        ? QStringList{localized(text("CPU 颜色")), localized(text("GPU 颜色")), localized(text("分隔线颜色"))}
        : clock ? QStringList{localized(text("小时颜色")), localized(text("分钟颜色")), localized(text("分隔线颜色"))}
        : QStringList{localized(text("高光颜色")), localized(text("主色")), localized(text("阴影颜色"))};
    const QString savedPalette = paletteSettings.value(QStringLiteral("customPalette/") + mode,
        clock && selected == QStringLiteral("custom") ? customClockPalette_ : QString()).toString();
    const QStringList savedColors = savedPalette.split(QLatin1Char(':')).mid(1);
    QList<QColor> values;
    QList<QPushButton*> swatches;
    for (int i = 0; i < 3; ++i) {
        const QColor saved(thermal ? thermalPreferences_.value(keys[i]).toString() : savedColors.value(i));
        values.append(saved.isValid() ? saved : defaults[i]);
        auto* row = new QHBoxLayout;
        row->addWidget(new StudioLabel(captions[i], &dialog), 1);
        auto* swatch = new StudioButton(&dialog);
        swatch->setFixedSize(112, 30);
        swatches.append(swatch);
        row->addWidget(swatch);
        layout->addLayout(row);
    }
    const auto refresh = [&] {
        for (int i = 0; i < 3; ++i) {
            swatches[i]->setEnabled(enabled->isChecked());
            swatches[i]->setText(values[i].name());
            swatches[i]->setStyleSheet(QStringLiteral("background:%1;color:%2;").arg(values[i].name(), values[i].lightness() > 140 ? QStringLiteral("#101820") : QStringLiteral("#ffffff")));
        }
    };
    for (int i = 0; i < 3; ++i) connect(swatches[i], &QPushButton::clicked, &dialog, [&, i] {
        const QColor value = QColorDialog::getColor(values[i], &dialog, captions[i], QColorDialog::DontUseNativeDialog);
        if (value.isValid()) { values[i] = value; refresh(); }
    });
    connect(enabled, &QCheckBox::toggled, &dialog, refresh);
    refresh();
    auto* actions = new QHBoxLayout;
    auto* reset = new StudioButton(english_ ? QStringLiteral("Defaults") : text("恢复默认"), &dialog);
    auto* cancel = new StudioButton(english_ ? QStringLiteral("Cancel") : text("取消"), &dialog);
    auto* apply = new StudioButton(english_ ? QStringLiteral("Apply") : text("应用"), &dialog);
    for (auto* button : {reset, cancel, apply}) { button->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed); actions->addWidget(button, 1); }
    layout->addLayout(actions);
    connect(reset, &QPushButton::clicked, &dialog, [&] { values = defaults; enabled->setChecked(false); refresh(); });
    connect(cancel, &QPushButton::clicked, &dialog, &QDialog::reject);
    connect(apply, &QPushButton::clicked, &dialog, &QDialog::accept);
    if (dialog.exec() != QDialog::Accepted) return;
    if (thermal) {
        thermalPreferences_.insert(QStringLiteral("custom"), enabled->isChecked());
        for (int i = 0; i < 3; ++i) thermalPreferences_.insert(keys[i], values[i].name());
    } else {
        const QString customPalette = QStringLiteral("custom:%1:%2:%3").arg(values[0].name(), values[1].name(), values[2].name());
        paletteSettings.setValue(QStringLiteral("customPalette/") + mode, customPalette);
        paletteSettings.setValue(QStringLiteral("presetPalette/") + mode, preset);
        if (clock) customClockPalette_ = customPalette;
        const QSignalBlocker blocker(paletteCombo);
        paletteCombo->setCurrentIndex(qMax(0, paletteCombo->findData(enabled->isChecked() ? QStringLiteral("custom") : preset)));
    }
    savePreferences();
    updateControls();
    if (debounce_) debounce_->start();
}

