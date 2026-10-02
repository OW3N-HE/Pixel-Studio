#include "PixelStudioPlugin.h"
#include "PixelStudioPanel.h"
#include "PixelStudioLogo.h"
#include <QApplication>
#include <QPalette>
#include <QPainter>

PixelStudioPlugin::~PixelStudioPlugin() { Unload(); }

OpenRGBPluginInfo PixelStudioPlugin::GetPluginInfo() {
    OpenRGBPluginInfo info{};
    info.Name = "Pixel Studio";
    info.Description = "Portrait pixel art, clocks and WLED DDP. Shared with the independent web edition.";
    info.Version = "0.2.0";
    info.Commit = "local-api4";
    info.URL = "http://127.0.0.1:8766/";
    info.Location = OPENRGB_PLUGIN_LOCATION_TOP;
    info.Label = "Pixel Studio";
    info.Icon = pixelStudioLogo(64);
    info.TabIcon = pixelStudioLogo(16);
    return info;
}

unsigned int PixelStudioPlugin::GetPluginAPIVersion() { return OPENRGB_PLUGIN_API_VERSION; }

void PixelStudioPlugin::Load(ResourceManagerInterface* resource_manager_ptr) {
    Q_UNUSED(resource_manager_ptr);
    const bool darkTheme = QApplication::palette().color(QPalette::Window).lightness() < 128;
    if (!panel_) panel_ = new PixelStudioPanel(darkTheme);
}

QWidget* PixelStudioPlugin::GetWidget() { return panel_.data(); }
QMenu* PixelStudioPlugin::GetTrayMenu() { return nullptr; }

void PixelStudioPlugin::Unload() {
    if (panel_) {
        panel_->shutdown();
        delete panel_.data();
        panel_ = nullptr;
    }
}
