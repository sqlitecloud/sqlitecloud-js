/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/withtypescriptreactnative.app',
      build: 'xcodebuild -workspace ios/withtypescriptreactnative.xcworkspace -scheme withtypescriptreactnative -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/withtypescriptreactnative.app',
      build: 'xcodebuild -workspace ios/withtypescriptreactnative.xcworkspace -scheme withtypescriptreactnative -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [
        8081
      ]
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release'
    }
  },
  devices: {
    simulator_15: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 8',
        os: 'iOS 15.0'
      }
    },
    simulator_16_4: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
        os: 'iOS 16.4'
      }
    },
    simulator_17: {
      type: 'ios.simulator',
      device: {
        type: 'iPad mini (6th generation)',
        os: 'iOS 17.0'
      }
    },
    simulator_18: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone SE (3rd generation)',
        os: 'iOS 18.0'
      }
    },

    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone SE (3rd generation)'
      }
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Medium_Phone_API_35'
      }
    }
  },
  configurations: {
    'ios.sim.15': {
      device: 'simulator_15',
      app: 'ios.release'
    },
    'ios.sim.16.4': {
      device: 'simulator_16_4',
      app: 'ios.release'
    },
    'ios.sim.17': {
      device: 'simulator_17',
      app: 'ios.release'
    },
    'ios.sim.18': {
      device: 'simulator_18',
      app: 'ios.release'
    },
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release'
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug'
    },
    'android.att.release': {
      device: 'attached',
      app: 'android.release'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release'
    }
  }
};
