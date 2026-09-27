/*
 * OpenRGB Plugin API 4 compatibility declarations.
 * Interface by herosilas12 (CoffeeIsLife), 2020, and Adam Honse, 2021.
 * Based on upstream OpenRGBPluginInterface.h at commit
 * 6fbcf62d7694e7b92fd0a5884b40b92984fbd1b0 (OpenRGB 1.0rc3 ABI).
 * ResourceManagerInterface is forward-declared: this plugin does not call it.
 * SPDX-License-Identifier: GPL-2.0-or-later
 * See THIRD-PARTY.md for provenance.
 */
#pragma once
#include <string>
#include <QImage>
#include <QMenu>
#include <QtPlugin>
#include <QWidget>
class ResourceManagerInterface;
#define OpenRGBPluginInterface_IID "com.OpenRGBPluginInterface"
#define OPENRGB_PLUGIN_API_VERSION 4
enum {
    OPENRGB_PLUGIN_LOCATION_TOP = 0,
    OPENRGB_PLUGIN_LOCATION_DEVICES = 1,
    OPENRGB_PLUGIN_LOCATION_INFORMATION = 2,
    OPENRGB_PLUGIN_LOCATION_SETTINGS = 3
};
struct OpenRGBPluginInfo {
    std::string Name;
    std::string Description;
    std::string Version;
    std::string Commit;
    std::string URL;
    QImage Icon;
    unsigned int Location;
    std::string Label;
    std::string TabIconString;
    QImage TabIcon;
};
class OpenRGBPluginInterface {
public:
    virtual ~OpenRGBPluginInterface() {}
    virtual OpenRGBPluginInfo GetPluginInfo() = 0;
    virtual unsigned int GetPluginAPIVersion() = 0;
    virtual void Load(ResourceManagerInterface* resource_manager_ptr) = 0;
    virtual QWidget* GetWidget() = 0;
    virtual QMenu* GetTrayMenu() = 0;
    virtual void Unload() = 0;
};
Q_DECLARE_INTERFACE(OpenRGBPluginInterface, OpenRGBPluginInterface_IID)
