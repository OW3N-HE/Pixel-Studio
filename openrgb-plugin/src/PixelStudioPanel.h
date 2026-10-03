#pragma once
#include <QWidget>
#include <QByteArray>
#include <QElapsedTimer>
#include <QImage>
#include <QColor>
#include <QRegion>
#include <QPointer>
#include <QHash>
#include <QSet>
#include <QJsonObject>
#include <QString>
#include <QStringList>
class QEvent;
class QShowEvent;
class QHideEvent;
class QCheckBox;
class QComboBox;
class QDoubleSpinBox;
class QLabel;
class QLineEdit;
class QListWidget;
class QListWidgetItem;
class QProcess;
class QPushButton;
class QSlider;
class QSpinBox;
class QTimer;
class QGridLayout;
class QVBoxLayout;
class QHBoxLayout;
class QGroupBox;
class QDialog;
class QSettings;

class PixelBoard final : public QWidget {
public:
    explicit PixelBoard(QWidget* parent = nullptr);
    void setFrame(int width, int height, const QByteArray& rgb);
    void setCadAppearance(bool enabled);
    void setPlaying(bool playing);
    void setThemeColors(const QColor& accent, const QColor& idle);
protected:
    void paintEvent(QPaintEvent*) override;
    void showEvent(QShowEvent*) override;
    void hideEvent(QHideEvent*) override;
    bool eventFilter(QObject*, QEvent*) override;
private:
    void syncGlowTimer();
    QPointer<QWidget> observedWindow_;
    int columns_ = 15;
    int rows_ = 27;
    QByteArray pixels_;
    bool cad_ = true;
    bool playing_ = false;
    QTimer* glowTimer_ = nullptr;
    QElapsedTimer glowClock_;
    QImage glowCache_;
    QRegion glowRegion_;
    QColor accent_ = QColor(142, 230, 186);
    QColor idleBorder_ = QColor("#425b51");
};

class PixelStudioPanel final : public QWidget {
    Q_OBJECT
public:
    explicit PixelStudioPanel(bool darkTheme, QWidget* parent = nullptr);
    ~PixelStudioPanel() override;
    void shutdown();
protected:
    QSize minimumSizeHint() const override { return QSize(0, 0); }
    void changeEvent(QEvent* event) override;
    bool eventFilter(QObject* watched, QEvent* event) override;
private:
    // Construction-only references; QObject parents retain widget ownership.
    struct SettingsPageParts {
        QDialog* dialog;
        QGridLayout* interfaceLayout;
        QGroupBox* screenSettings;
        QVBoxLayout* screenLayout;
    };
    SettingsPageParts createSettingsPage(QSettings& settings, QHBoxLayout* languageRow,
        QLabel* languageLabel, QPushButton* web, QPushButton* settingsButton,
        QGroupBox* setup, QHBoxLayout* screenToolbar);
    QGroupBox* createLibrarySource(QSettings& settings);
    void createActionRow(QVBoxLayout* shell, QSettings& settings);
    void createShuffleControls(QSettings& settings, QHBoxLayout* filterRow);
    void applyInitialControlMetrics(QPushButton* settingsButton, QDialog* libraryDialog);
    struct OutputParts {
        QGroupBox* group;
        QGridLayout* controls;
        QWidget* serialControl;
        QHBoxLayout* screenToolbar;
        QWidget* fpsControl;
    };
    OutputParts createOutputControls(QVBoxLayout* shell, QSettings& settings,
        QHBoxLayout* sizeRow, QHBoxLayout* presetRow);
    struct HeaderParts {
        QPushButton* web;
        QHBoxLayout* languageRow;
        QPushButton* settingsButton;
        QLabel* languageLabel;
    };
    HeaderParts createHeader(QVBoxLayout* shell, QSettings& settings);
    void restoreFavoritePreferences(QSettings& settings);
    struct PreviewParts {
        QWidget* pane;
        QHBoxLayout* dimensions;
        QHBoxLayout* presets;
        QPushButton* preset15;
        QPushButton* preset14;
        QWidget* boardSlot;
    };
    PreviewParts createPreviewPane(QWidget* workspace, QSettings& settings);
    struct LibraryParts {
        QWidget* pane;
        QHBoxLayout* toolbar;
    };
    LibraryParts createLibrary(QWidget* workspace);
    void initializeHelper();
    void initializePlayback();
    void arrangeSettingsAndLiveControls(QSettings& settings, const OutputParts& output,
        const PreviewParts& preview, const HeaderParts& header,
        const SettingsPageParts& page, QGroupBox* setup);
    void finalizeControlMetrics(const OutputParts& output, const PreviewParts& preview, const HeaderParts& header);
    void boot();
    void consumeOutput();
    void handleMessage(const QJsonObject& message);
    void send(const QString& operation, const QJsonObject& payload = {});
    void updatePreview();
    void updateControls();
    void showStatus(const QString& message, bool error = false, const QStringList& arguments = {});
    QString localized(const QString& source) const;
    void setLabelText(QLabel* label, const QString& source, const QStringList& arguments = {});
    void retranslateUi();
    void filterGallery();
    void savePreferences();
    void applyTheme();
    void advanceRandomAnimation();
    void arrangeLiveControls(bool clockSelected, bool paletteSelected = false);
    void updateThermalControls();
    void editThermalColors();
    QJsonObject thermalConfiguration() const;
    QJsonObject configuration() const;

    PixelBoard* outputBoard_ = nullptr;
    QLineEdit* projectPath_ = nullptr;
    QLineEdit* nodePath_ = nullptr;
    QLineEdit* host_ = nullptr;
    QLineEdit* serialPort_ = nullptr;
    QLineEdit* search_ = nullptr;
    QListWidget* gallery_ = nullptr;
    QHash<QString, QListWidgetItem*> cards_;
    QSet<QString> favoriteModes_;
    QSpinBox* width_ = nullptr;
    QSpinBox* height_ = nullptr;
    QSpinBox* brightness_ = nullptr;
    QSlider* brightnessSlider_ = nullptr;
    QSpinBox* fps_ = nullptr;
    QDoubleSpinBox* speed_ = nullptr;
    QComboBox* colorMatching_ = nullptr;
    QDoubleSpinBox* gamma_ = nullptr;
    QSlider* speedSlider_ = nullptr;
    QComboBox* mapping_ = nullptr;
    QComboBox* category_ = nullptr;
    QComboBox* language_ = nullptr;
    QComboBox* theme_ = nullptr;
    QComboBox* transport_ = nullptr;
    QComboBox* clockFont_ = nullptr;
    QComboBox* clockPalette_ = nullptr;
    QComboBox* circuitPalette_ = nullptr;
    QPushButton* customColorsButton_ = nullptr;
    QPushButton* animationColorsButton_ = nullptr;
    QString customClockPalette_;
    QLabel* clockLabel_ = nullptr;
    QWidget* clockControls_ = nullptr;
    QLabel* clockColorLabel_ = nullptr;
    QWidget* clockColorControls_ = nullptr;
    QGridLayout* liveLayout_ = nullptr;
    QWidget* thermalSamplingControls_ = nullptr;
    QWidget* thermalColorControls_ = nullptr;
    QLabel* thermalSamplingLabel_ = nullptr;
    QLabel* thermalSamplingUnit_ = nullptr;
    QSlider* thermalSamplingSlider_ = nullptr;
    QComboBox* thermalFont_ = nullptr;
    QComboBox* thermalCpu_ = nullptr;
    QComboBox* thermalGpu_ = nullptr;
    QDoubleSpinBox* thermalSampling_ = nullptr;
    QPushButton* thermalCustom_ = nullptr;
    QJsonObject thermalPreferences_;
    QJsonObject thermalLegacyPreferences_;
    QJsonObject thermalPreferencesByMode_;
    QString thermalMode_;
    QWidget* brightnessControls_ = nullptr;
    QWidget* speedControls_ = nullptr;
    QWidget* brightnessLabel_ = nullptr;
    QWidget* speedLabel_ = nullptr;
    QCheckBox* cad_ = nullptr;
    QCheckBox* autoStart_ = nullptr;
    QCheckBox* randomPlayback_ = nullptr;
    QSpinBox* randomDuration_ = nullptr;
    QTimer* randomTimer_ = nullptr;
    QLabel* status_ = nullptr;
    QLabel* stats_ = nullptr;
    QPushButton* load_ = nullptr;
    QPushButton* start_ = nullptr;
    QPushButton* stop_ = nullptr;
    QPushButton* deviceSize_ = nullptr;
    QPushButton* serialScan_ = nullptr;
    QProcess* helper_ = nullptr;
    QTimer* debounce_ = nullptr;
    QTimer* heartbeat_ = nullptr;
    QByteArray input_;
    int sequence_ = 0;
    int previewSequence_ = 0;
    bool ready_ = false;
    bool busy_ = false;
    bool streaming_ = false;
    bool playbackIntent_ = false;
    bool resumeOnReady_ = false;
    bool closing_ = false;
    bool english_ = false;
    bool languageUiReady_ = false;
    QString savedMode_;
};
