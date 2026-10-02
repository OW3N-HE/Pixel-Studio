cmake_minimum_required(VERSION 3.20)
project(PixelStudioPlugin VERSION 0.2.0 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)
find_package(Qt5 5.15.0 EXACT REQUIRED COMPONENTS Core Gui Widgets)
get_filename_component(PIXEL_STUDIO_PROJECT_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/.." ABSOLUTE)
add_library(PixelStudioPlugin MODULE
    src/PixelStudioPlugin.cpp src/PixelStudioPlugin.h
    src/PixelStudioPanel.cpp
    src/PixelStudioBoard.cpp
    src/PixelStudioPreviewPane.cpp
    src/PixelStudioHeader.cpp
    src/PixelStudioOutputControls.cpp
    src/PixelStudioLibrarySource.cpp
    src/PixelStudioActions.cpp
    src/PixelStudioControlMetrics.cpp
    src/PixelStudioInterfaceAssembly.cpp
    src/PixelStudioPreferences.cpp
    src/PixelStudioMessages.cpp
    src/PixelStudioSettingsPage.cpp
    src/PixelStudioGallery.cpp
    src/PixelStudioLanguage.cpp
    src/PixelStudioProcess.cpp
    src/PixelStudioPlayback.cpp
    src/PixelStudioAppearance.cpp
    src/PixelStudioThermalControls.cpp
    src/PixelStudioPaletteDialog.cpp
    src/PixelStudioWidgets.h
    src/PixelStudioSupport.h src/PixelStudioPanel.h
    compat/OpenRGBPluginInterface.h plugin.json)
target_link_libraries(PixelStudioPlugin PRIVATE Qt5::Core Qt5::Gui Qt5::Widgets)
target_compile_definitions(PixelStudioPlugin PRIVATE
    PIXEL_STUDIO_PROJECT_ROOT="")
if(MSVC)
    target_compile_options(PixelStudioPlugin PRIVATE /utf-8 /W4)
    set_property(TARGET PixelStudioPlugin PROPERTY
        MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")
endif()
set_target_properties(PixelStudioPlugin PROPERTIES
    PREFIX ""
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/dist"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/dist")

if(WIN32)
    add_executable(PixelStudioSerial src/PixelStudioSerial.cpp)
    set_target_properties(PixelStudioSerial PROPERTIES
        AUTOMOC OFF
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/dist")
    if(MSVC)
        target_compile_options(PixelStudioSerial PRIVATE /utf-8 /W4)
        set_property(TARGET PixelStudioSerial PROPERTY
            MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
    endif()
    add_dependencies(PixelStudioPlugin PixelStudioSerial)
endif()
