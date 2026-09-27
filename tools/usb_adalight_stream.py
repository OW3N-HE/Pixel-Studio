#!/usr/bin/env python3
"""Persistent binary writer for WLED Adalight over native ESP32-C3 USB CDC."""

import argparse
import json
import sys
import time

import serial

USB_CHUNK_BYTES = 4096
USB_CHUNK_DELAY_SECONDS = 0.0


def emit(kind, **values):
    print(json.dumps({"type": kind, **values}, ensure_ascii=True), flush=True)


def read_exact(stream, size):
    chunks = bytearray()
    while len(chunks) < size:
        chunk = stream.read(size - len(chunks))
        if not chunk:
            return None
        chunks.extend(chunk)
    return chunks


def write_packet(device, packet):
    """Pace native USB CDC writes so the ESP32-C3 receive buffer cannot overflow."""
    for offset in range(0, len(packet), USB_CHUNK_BYTES):
        chunk = packet[offset:offset + USB_CHUNK_BYTES]
        written = device.write(chunk)
        if written != len(chunk):
            raise IOError(f"Short USB write: {written}/{len(chunk)}")
        device.flush()
        if offset + USB_CHUNK_BYTES < len(packet):
            time.sleep(USB_CHUNK_DELAY_SECONDS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True)
    parser.add_argument("--pixels", required=True, type=int)
    parser.add_argument("--baud", type=int, default=115200)
    args = parser.parse_args()
    if args.pixels < 1 or args.pixels > 4096:
        raise ValueError("Pixel count must be between 1 and 4096.")

    device = serial.Serial()
    device.port = args.port
    device.baudrate = args.baud
    device.timeout = 1
    device.write_timeout = 2
    device.dtr = False
    device.rts = False
    device.open()
    device.dtr = False
    device.rts = False
    time.sleep(2.5)
    # Enter realtime mode with a packet that fits in one CDC transfer. This
    # prevents the currently running WLED effect from touching the frame buffer
    # while the first full frame arrives in several USB chunks.
    write_packet(device, b"Ada\x00\x00\x55\x00\x00\x00")
    time.sleep(0.05)
    emit("ready", port=args.port, pixels=args.pixels)

    packet_size = 6 + args.pixels * 3
    try:
        while True:
            packet = read_exact(sys.stdin.buffer, packet_size)
            if packet is None:
                break
            write_packet(device, packet)
            emit("frame")
    finally:
        device.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit("error", message=str(error))
        raise
