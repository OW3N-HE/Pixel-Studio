#pragma once
#include "../compat/OpenRGBPluginInterface.h"
#include <QObject>
#include <QPointer>
class PixelStudioPanel;
class PixelStudioPlugin final : public QObject, public OpenRGBPluginInterface {
    Q_OBJECT
    Q_PLUGIN_METADATA(IID OpenRGBPluginInterface_IID FILE "../plugin.json")
    Q_INTERFACES(OpenRGBPluginInterface)
public:
    ~PixelStudioPlugin() override;
    OpenRGBPluginInfo GetPluginInfo() override;
    unsigned int GetPluginAPIVersion() override;
    void Load(ResourceManagerInterface* resource_manager_ptr) override;
    QWidget* GetWidget() override;
    QMenu* GetTrayMenu() override;
    void Unload() override;
private:
    QPointer<PixelStudioPanel> panel_;
};
