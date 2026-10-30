
/*
 MAQUEEN LITE STANDARD + MICRO:BIT
 Microsoft MakeCode JavaScript / TypeScript

 AUTO       : line following 2 sensor IR
 MANUAL     : control by tilting micro:bit
 SCAN       : search for line
 OBSTACLE   : stop at 15 cm or less
 EMERGENCY  : press A+B to toggle emergency stop

 Extension:
 https://github.com/DFRobot/pxt-maqueen

 No NeoPixel.
*/

let autoMode = true
let emergencyStop = false
let manualScan = false
let obstacleStop = false

let baseSpeed = 105
let turnSpeed = 70
let searchSpeed = 65
let obstacleLimit = 15

let leftSensor = 1
let rightSensor = 1
let distance = -1
let lastTurn = 0

// --------------------------------------------------
// MOTOR CONTROL
// M1 = left motor
// M2 = right motor
// --------------------------------------------------

function motorStopAll() {
    maqueen.motorStop(maqueen.Motors.All)
}

function setOneMotor(motor: maqueen.Motors, speed: number) {
    let power = Math.abs(speed)

    if (power > 255) {
        power = 255
    }

    if (speed == 0) {
        maqueen.motorStop(motor)
    } else if (motor == maqueen.Motors.M1) {
        if (speed > 0) {
            maqueen.motorRun(motor, maqueen.Dir.CW, power)
        } else {
            maqueen.motorRun(motor, maqueen.Dir.CCW, power)
        }
    } else {
        if (speed > 0) {
            maqueen.motorRun(motor, maqueen.Dir.CCW, power)
        } else {
            maqueen.motorRun(motor, maqueen.Dir.CW, power)
        }
    }
}

function driveMotors(leftSpeed: number, rightSpeed: number) {
    setOneMotor(maqueen.Motors.M1, leftSpeed)
    setOneMotor(maqueen.Motors.M2, rightSpeed)
}

function stopRobot() {
    motorStopAll()
}

// --------------------------------------------------
// INDICATOR LEDS
// --------------------------------------------------

function ledsOff() {
    maqueen.writeLED(
        maqueen.LED.LEDLeft,
        maqueen.LEDswitch.turnOff
    )
    maqueen.writeLED(
        maqueen.LED.LEDRight,
        maqueen.LEDswitch.turnOff
    )
}

function ledsOn() {
    maqueen.writeLED(
        maqueen.LED.LEDLeft,
        maqueen.LEDswitch.turnOn
    )
    maqueen.writeLED(
        maqueen.LED.LEDRight,
        maqueen.LEDswitch.turnOn
    )
}

// --------------------------------------------------
// SOUND
// --------------------------------------------------

function beepWarning() {
    music.playTone(880, 150)
}

function beepEmergency() {
    music.playTone(440, 300)
}

function beepMode() {
    music.playTone(660, 100)
}

// --------------------------------------------------
// MODE INDICATOR
// --------------------------------------------------

function showMode() {
    if (emergencyStop) {
        basic.showString("X")
    } else if (obstacleStop) {
        basic.showString("!")
    } else if (autoMode) {
        basic.showString("A")
    } else {
        basic.showString("M")
    }
}

// --------------------------------------------------
// SENSOR READINGS
// --------------------------------------------------

function readLineSensors() {
    leftSensor = maqueen.readPatrol(
        maqueen.Patrol.PatrolLeft
    )

    rightSensor = maqueen.readPatrol(
        maqueen.Patrol.PatrolRight
    )
}

function readDistance() {
    distance = maqueen.Ultrasonic()
}

// --------------------------------------------------
// OBSTACLE DETECTION
// --------------------------------------------------

function checkObstacle(): boolean {
    readDistance()

    // 0 or negative values can mean invalid readings.
    // Do not treat invalid readings as a detected obstacle.
    if (distance > 0 && distance <= obstacleLimit) {
        if (!obstacleStop) {
            obstacleStop = true
            stopRobot()
            beepWarning()
            showMode()
        }

        return true
    }

    if (obstacleStop) {
        obstacleStop = false
        showMode()
    }

    return false
}

// --------------------------------------------------
// AUTO LINE FOLLOWING
//
// The standard Maqueen patrol sensors normally return:
// 0 = black line
// 1 = white surface
//
// The robot keeps moving and adjusts wheel speeds.
// --------------------------------------------------

function followLine() {
    readLineSensors()

    if (leftSensor == 0 && rightSensor == 0) {
        // Both sensors see black.
        // Continue forward.
        driveMotors(baseSpeed, baseSpeed)
    } else if (leftSensor == 0 && rightSensor == 1) {
        // Line is detected on the left side.
        // Correct toward the left.
        lastTurn = -1
        driveMotors(baseSpeed - turnSpeed, baseSpeed)
    } else if (leftSensor == 1 && rightSensor == 0) {
        // Line is detected on the right side.
        // Correct toward the right.
        lastTurn = 1
        driveMotors(baseSpeed, baseSpeed - turnSpeed)
    } else {
        // Both sensors see white: line may be lost.
        scanForLine()
    }
}

// --------------------------------------------------
// SCAN FOR LINE
// --------------------------------------------------

function scanForLine() {
    basic.showString("?")

    if (lastTurn < 0) {
        // Search left
        driveMotors(-searchSpeed, searchSpeed)
    } else if (lastTurn > 0) {
        // Search right
        driveMotors(searchSpeed, -searchSpeed)
    } else {
        // No previous turn direction: search left
        driveMotors(-searchSpeed, searchSpeed)
    }
}

// --------------------------------------------------
// MANUAL CONTROL BY TILTING MICRO:BIT
//
// Tilt left/right to steer.
// Tilt forward/backward to move.
// Keep micro:bit level to stop.
// --------------------------------------------------

function manualControl() {
    let pitch = input.rotation(Rotation.Pitch)
    let roll = input.rotation(Rotation.Roll)

    let forward = 0
    let steering = 0

    if (pitch < -15) {
        forward = baseSpeed
    } else if (pitch > 15) {
        forward = -baseSpeed
    }

    if (roll < -15) {
        steering = -turnSpeed
    } else if (roll > 15) {
        steering = turnSpeed
    }

    let leftSpeed = forward + steering
    let rightSpeed = forward - steering

    // Limit wheel speed to the allowed range.
    if (leftSpeed > 255) {
        leftSpeed = 255
    }
    if (leftSpeed < -255) {
        leftSpeed = -255
    }
    if (rightSpeed > 255) {
        rightSpeed = 255
    }
    if (rightSpeed < -255) {
        rightSpeed = -255
    }

    driveMotors(leftSpeed, rightSpeed)
}

// --------------------------------------------------
// BUTTON A: TOGGLE AUTO / MANUAL
// --------------------------------------------------

input.onButtonPressed(Button.A, function () {
    if (!emergencyStop) {
        autoMode = !autoMode
        manualScan = false
        stopRobot()
        beepMode()
        showMode()
    }
})

// --------------------------------------------------
// BUTTON B: MANUAL SCAN MODE
// Press B to toggle scan mode while in MANUAL.
// --------------------------------------------------

input.onButtonPressed(Button.B, function () {
    if (!emergencyStop && !autoMode) {
        manualScan = !manualScan
        stopRobot()

        if (manualScan) {
            basic.showString("?")
        } else {
            showMode()
        }
    }
})

// --------------------------------------------------
// BUTTON A+B: EMERGENCY STOP ON/OFF
// Press A+B again to release the emergency stop.
// --------------------------------------------------

input.onButtonPressed(Button.AB, function () {
    emergencyStop = !emergencyStop
    manualScan = false
    obstacleStop = false
    stopRobot()

    if (emergencyStop) {
        ledsOn()
        beepEmergency()
        basic.showString("X")
    } else {
        ledsOff()
        showMode()
    }
})

// --------------------------------------------------
// STARTUP
// --------------------------------------------------

basic.showString("MQ")
basic.pause(300)
showMode()

// --------------------------------------------------
// MAIN LOOP
// --------------------------------------------------

basic.forever(function () {
    if (emergencyStop) {
        stopRobot()
        basic.pause(50)
    } else if (checkObstacle()) {
        stopRobot()
        basic.pause(100)
    } else if (autoMode) {
        manualScan = false
        followLine()
        basic.pause(10)
    } else if (manualScan) {
        scanForLine()
        basic.pause(20)
    } else {
        manualControl()
        basic.pause(20)
    }
})
