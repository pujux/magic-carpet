from multiprocessing import Process

from cryptography.hazmat.primitives.asymmetric import rsa

from pymobiledevice3.cli.remote import get_device_list
from pymobiledevice3.remote.core_device_tunnel_service import create_core_device_tunnel_service
from pymobiledevice3.remote.remote_service_discovery import RemoteServiceDiscoveryService
from pymobiledevice3.services.dvt.dvt_secure_socket_proxy import DvtSecureSocketProxyService
from pymobiledevice3.services.dvt.instruments.location_simulation import LocationSimulation

import asyncio
import eventlet
import os
import socketio

def setup_server(tunnel_host, tunnel_port):
    clients = {}
    
    sio = socketio.Server(cors_allowed_origins='*')
    app_dir = os.path.dirname(__file__)

    app = socketio.WSGIApp(sio, static_files={
        '/': os.path.join(app_dir, 'index.html'),
        '/index.js': os.path.join(app_dir, 'index.js'),
    })

    @sio.event
    def connect(sid, _):
        rsd = RemoteServiceDiscoveryService((tunnel_host, tunnel_port))
        rsd.connect()

        dvt_proxy = DvtSecureSocketProxyService(rsd)
        dvt_proxy.perform_handshake()
        location_sim = LocationSimulation(dvt_proxy)

        clients[sid] = [rsd, location_sim]

    @sio.event
    def location(sid, data):
        lat, long = map(float, data.split(','))

        clients[sid][1].simulate_location(lat, long)

    @sio.event
    def disconnect(sid):
        clients[sid][1].stop()
        clients[sid][0].service.close()

        del clients[sid]

    eventlet.wsgi.server(eventlet.listen(('localhost', 5000)), app) # type: ignore

async def start_quic_tunnel(service_provider):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    with create_core_device_tunnel_service(service_provider, autopair=True) as tunnel_service:
        async with tunnel_service.start_quic_tunnel(private_key) as tunnel:
            print_device_info(service_provider)

            process = Process(target=setup_server, args=(tunnel.address, tunnel.port))
            process.start()

            while True:
                await asyncio.sleep(0.5)

def print_device_info(service_provider):
    print('\nConnected to:')
    print(f'UDID: {service_provider.udid}')
    print(f'ProductType: {service_provider.product_type}')
    print(f'ProductVersion: {service_provider.product_version}')
    print('\n')

if __name__ == '__main__':
    try:
        devices = get_device_list()
        if not devices:
            raise Exception('NoDeviceConnectedError')
        elif len(devices) > 1:
            raise Exception('TooManyDevicesConnectedError')
        asyncio.run(start_quic_tunnel(devices[0]))
    except KeyboardInterrupt:
        print("Program interrupted by user")
