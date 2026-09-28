// SPDX-License-Identifier: GPL-2.0-or-later
// Windows-only Adalight writer. stdin: binary frames; stdout: JSON events.
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <io.h>
#include <fcntl.h>
#include <algorithm>
#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
struct Port {
    HANDLE value = INVALID_HANDLE_VALUE;
    ~Port() { if (value != INVALID_HANDLE_VALUE) CloseHandle(value); }
};

[[noreturn]] void systemError(const char* operation) {
    // Keep diagnostics language-neutral rather than returning localized OS text.
    const DWORD code = GetLastError();
    throw std::runtime_error(std::string(operation) + " failed (Windows error " +
                             std::to_string(code) + ").");
}

unsigned number(const std::string& text, unsigned maximum) {
    if (text.empty() || text.find_first_not_of("0123456789") != std::string::npos)
        throw std::runtime_error("Invalid numeric argument.");
    const auto value = std::stoul(text);
    if (value == 0 || value > maximum) throw std::runtime_error("Argument out of range.");
    return static_cast<unsigned>(value);
}

void errorEvent(const std::string& message) {
    std::cout << "{\"type\":\"error\",\"message\":\"";
    for (const unsigned char c : message) {
        if (c == '"' || c == '\\') std::cout << '\\' << static_cast<char>(c);
        else if (c >= 32 && c < 127) std::cout << static_cast<char>(c);
        else std::cout << ' ';
    }
    std::cout << "\"}\n" << std::flush;
}

bool readFrame(std::vector<unsigned char>& frame) {
    size_t offset = 0;
    while (offset < frame.size()) {
        const int count = _read(_fileno(stdin), frame.data() + offset,
                               static_cast<unsigned>(frame.size() - offset));
        if (count < 0) throw std::runtime_error("Cannot read the animation input pipe.");
        if (count == 0) {
            if (offset != 0) throw std::runtime_error("Truncated Adalight frame.");
            return false;
        }
        offset += static_cast<size_t>(count);
    }
    return true;
}

void writePacket(HANDLE port, const unsigned char* data, size_t size) {
    const ULONGLONG deadline = GetTickCount64() + 2000;
    size_t offset = 0;
    while (offset < size) {
        const ULONGLONG now = GetTickCount64();
        if (now >= deadline) throw std::runtime_error("Serial frame write timed out.");
        COMMTIMEOUTS timeouts{};
        timeouts.ReadIntervalTimeout = MAXDWORD;
        timeouts.WriteTotalTimeoutConstant = static_cast<DWORD>(deadline - now);
        if (!SetCommTimeouts(port, &timeouts)) systemError("SetCommTimeouts");
        const DWORD wanted = static_cast<DWORD>(std::min<size_t>(4096, size - offset));
        DWORD written = 0;
        if (!WriteFile(port, data + offset, wanted, &written, nullptr)) systemError("Serial write");
        if (written == 0) throw std::runtime_error("Serial write made no progress.");
        offset += written;

        // Bounded queue drain instead of FlushFileBuffers, which can block
        // indefinitely on a disconnected or stalled device/driver.
        for (;;) {
            DWORD errors = 0;
            COMSTAT status{};
            if (!ClearCommError(port, &errors, &status)) systemError("Serial status");
            if (errors != 0) throw std::runtime_error("Serial communication error " + std::to_string(errors) + ".");
            if (status.cbOutQue == 0) break;
            if (GetTickCount64() >= deadline) throw std::runtime_error("Serial output queue timed out.");
            Sleep(1);
        }
    }
}
} // namespace

int main(int argc, char** argv) {
    try {
        std::string name;
        unsigned pixels = 0, baud = 115200;
        for (int i = 1; i < argc; i += 2) {
            if (i + 1 >= argc) throw std::runtime_error("Missing argument value.");
            const std::string key = argv[i];
            if (key == "--port") name = argv[i + 1];
            else if (key == "--pixels") pixels = number(argv[i + 1], 4096);
            else if (key == "--baud") baud = number(argv[i + 1], 4000000);
            else throw std::runtime_error("Unknown argument.");
        }
        if (name.size() < 4 || name.substr(0, 3) != "COM" || pixels == 0)
            throw std::runtime_error("Specify --port COMn and --pixels 1..4096.");
        (void)number(name.substr(3), 65535);
        if (_setmode(_fileno(stdin), _O_BINARY) == -1)
            throw std::runtime_error("Cannot enable binary input.");

        Port port;
        const std::string device = "\\\\.\\" + name;
        port.value = CreateFileA(device.c_str(), GENERIC_READ | GENERIC_WRITE, 0,
                                 nullptr, OPEN_EXISTING, 0, nullptr);
        if (port.value == INVALID_HANDLE_VALUE) systemError("Open serial port");
        DCB dcb{};
        dcb.DCBlength = sizeof(dcb);
        if (!GetCommState(port.value, &dcb)) systemError("GetCommState");
        dcb.BaudRate = baud;
        dcb.ByteSize = 8;
        dcb.Parity = NOPARITY;
        dcb.StopBits = ONESTOPBIT;
        dcb.fBinary = TRUE;
        dcb.fParity = FALSE;
        dcb.fOutxCtsFlow = FALSE;
        dcb.fOutxDsrFlow = FALSE;
        dcb.fDtrControl = DTR_CONTROL_DISABLE;
        dcb.fDsrSensitivity = FALSE;
        dcb.fTXContinueOnXoff = TRUE;
        dcb.fOutX = FALSE;
        dcb.fInX = FALSE;
        dcb.fErrorChar = FALSE;
        dcb.fNull = FALSE;
        dcb.fRtsControl = RTS_CONTROL_DISABLE;
        dcb.fAbortOnError = FALSE;
        if (!SetCommState(port.value, &dcb)) systemError("SetCommState");
        if (!EscapeCommFunction(port.value, CLRDTR)) systemError("Clear DTR");
        if (!EscapeCommFunction(port.value, CLRRTS)) systemError("Clear RTS");
        if (!PurgeComm(port.value, PURGE_RXCLEAR | PURGE_TXCLEAR)) systemError("PurgeComm");

        // Preserve the previous writer's startup wait and realtime warm-up.
        Sleep(2500);
        const unsigned char warmup[] = {'A', 'd', 'a', 0, 0, 0x55, 0, 0, 0};
        writePacket(port.value, warmup, sizeof(warmup));
        Sleep(50);
        std::cout << "{\"type\":\"ready\",\"port\":\"" << name
                  << "\",\"pixels\":" << pixels << "}\n" << std::flush;
        if (!std::cout) return 1;

        std::vector<unsigned char> frame(6 + pixels * 3);
        const unsigned count = pixels - 1;
        while (readFrame(frame)) {
            if (frame[0] != 'A' || frame[1] != 'd' || frame[2] != 'a' ||
                frame[3] != (count >> 8) || frame[4] != (count & 255) ||
                frame[5] != (frame[3] ^ frame[4] ^ 0x55))
                throw std::runtime_error("Invalid Adalight frame header.");
            writePacket(port.value, frame.data(), frame.size());
            // Host write completion, NOT a physical LED/device acknowledgement.
            std::cout << "{\"type\":\"frame\"}\n" << std::flush;
            if (!std::cout) return 1;
        }
        return 0;
    } catch (const std::exception& error) {
        errorEvent(error.what());
        return 1;
    }
}
