/*** socket.onclose Tester *******************************************

 Version: 1.00
 (c) Ralph Wetzel
 -----------------------------------------------------------------------------
 Author: Ralph Wetzel <ralph.wetzel@gmx.de>
 Description: This module allows to access 1-Wire(R) sensor data provided by owserver from Z-Wave.me

 ******************************************************************************/
'use strict'

function OnCloseTester(id, controller) {
    // Call superconstructor first (AutomationModule)
    OnCloseTester.super_.call(this, id, controller);

    this.ip = "127.0.0.1";
    // this.port = 5555;

}

inherits(OnCloseTester, AutomationModule);

_module = OnCloseTester;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

OnCloseTester.prototype.init = function (config) {
    OnCloseTester.super_.prototype.init.call(this, config);

    var self = this;

    self.increment = config.increment;
    self.port = config.port;

    var langFile = self.controller.loadModuleLang("OnCloseTester");

    self.vDev = self.controller.devices.create({
        deviceId: "OnCloseTester"+self.id,
        defaults: {
            deviceType: "toggleButton",
            metrics: {
                icon: 'press',
                title: 'OnClose Test Button'
            }
        },
        overlay: {},
        handler:  function (command, args) {
            switch(command){
                case "on":
                    self.test();
                    break;
                default:
                    OnCloseTester.super_.prototype.performCommand.call(this, command);
            }
        },
        moduleId: self.id,
    });
};

OnCloseTester.prototype.stop = function () {
    var self = this;

    self.controller.devices.remove(self.vDev.id);
    self.vDev = undefined;

    if (self.server) {
        self.server.close();
        self.server = undefined;
    }

    if (self.client) {
        self.client.close();
        self.client = undefined;
    }

    OnCloseTester.super_.prototype.stop.call(self);
};

/*OnCloseTester.prototype.performCommand = function(command) {
    debugPrint("*** OnCloseTester | performCommand = " + command);

    var handled = true;
    if ("on" === command) {
        var self = this;
        self.test();
    } else {
        handled = false;
    }
    return handled ? true : OnCloseTester.super_.prototype.performCommand.call(this, command);
};*/


OnCloseTester.prototype.test = function () {

    var self = this;
    var port_inc = 1;

    self.reconnect = false;

    if (self.client !== undefined) {
        debugPrint("*** OnCloseTester | Client: Forcing close()");
        self.client.close();
        self.client = undefined;
    }

    if (self.server !== undefined) {
        debugPrint("*** OnCloseTester | Server: Forcing close()");
        self.reconnect = true;
        self.server.close();
        self.server = undefined;
        if (self.increment === true) {
            self.port += port_inc;
        }
        debugPrint("*** OnCloseTester | Server: onclose() will restart with port " + self.port + " ...");
        return;
    }

    var server = new sockets.tcp();
    self.server = server;

    server.reusable();
    debugPrint("*** OnCloseTester | Server: bind() to port " + self.port + " ...");
    server.bind(self.ip, self.port);

    server.onconnect = function(remoteHost,remotePort,localHost,localPort) {
        debugPrint("*** OnCloseTester | Server: Client connection from remote port " + remotePort + ".");
    };

    server.onrecv = function(data) {
        debugPrint("*** OnCloseTester | Server: Received data...");
        var msg = String.fromCharCode.apply(null, new Uint8Array(data));
        debugPrint("*** OnCloseTester | Server: Echoing '" + msg + "'");
        this.send(msg);
        this.close();
        debugPrint("*** OnCloseTester | Server: Closed connection.");
    };

    server.onclose = function() {
        debugPrint("*** OnCloseTester | Server: socket.onclose() triggered!");
        debugPrint("*** OnCloseTester | Server: Restarting? => " + self.reconnect);
        if (self.reconnect === true) {
            debugPrint("*** OnCloseTester | Server: Restarting in 1000ms...");
            setTimeout(_.bind(self.test, self), 1000);
            // setTimeout(self.test, 1000, self);
        }
    };

    debugPrint("*** OnCloseTester | Server: Listening @ " + self.port + " ...");
    server.listen();

    var client = new sockets.tcp();

    client.onconnect = function(remoteHost,remotePort,localHost,localPort) {
        debugPrint("*** OnCloseTester | Client: Connected using local port " + localPort);
        var msg = "This is the TEST message!";
        debugPrint("*** OnCloseTester | Client: Sending '" + msg + "'...");
        debugPrint("*** OnCloseTester | Client: Sending success: '" + this.send(msg) + "'");
    };

    client.onrecv = function(data) {
        var msg = String.fromCharCode.apply(null, new Uint8Array(data));
        debugPrint("*** OnCloseTester | Client: Received echo: '" + msg + "'");
    };

    client.onclose = function() {
        debugPrint("*** OnCloseTester | Client: socket.onclose() triggered!");
        this.close();
    };

    debugPrint("*** OnCloseTester | Client: Connecting to " + self.ip + ":" + self.port);
    client.connect(self.ip, self.port);

    self.client = client;

};
