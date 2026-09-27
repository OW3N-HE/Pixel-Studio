cmake_minimum_required(VERSION 3.20)
project(PixelStudioPlugin VERSION 0.1.3 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)
find_package(Qt5 5.15.0 EXACT REQUIRED COMPONENTS Core Gui Widgets)
get_filename_component(PIXEL_STUDIO_PROJECT_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/.." ABSOLUTE)
add_library(PixelStudioPlugin MODULE
    src/PixelStudioPlugin.cpp src/PixelStudioPlugin.h
    src/PixelStudioPanel.cpp src/PixelStudioPanel.h
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
