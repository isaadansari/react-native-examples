import * as turf from '@turf/turf';
import * as THREE from 'three';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const getDistance = (coord1, coord2) => {
    const from = turf.point([coord1.longitude, coord1.latitude]);
    const to = turf.point([coord2.longitude, coord2.latitude]);
    const distanceInKilometers = turf.distance(from, to);
    const distanceInMiles = turf.distance(from, to, { units: 'miles' });
    const distanceInRadians = turf.distance(from, to, { units: 'radians' });
    const distanceInDegrees = turf.distance(from, to, { units: 'degrees' });
    return {
        distanceInKilometers,
        distanceInMiles,
        distanceInRadians,
        distanceInDegrees
    };
};

export const getBearing = (coord1, coord2) => {
    const point1 = turf.point([coord1.longitude, coord1.latitude]);
    const point2 = turf.point([coord2.longitude, coord2.latitude]);
    const bearingInDegrees = turf.bearing(point1, point2);
    const bearingInRadians = turf.helpers.degreesToRadians(bearingInDegrees);
    return {
        bearingInDegrees,
        bearingInRadians
    };
};

export const getRhumbBearing = (coord1, coord2) => {
    const point1 = turf.point([coord1.longitude, coord1.latitude]);
    const point2 = turf.point([coord2.longitude, coord2.latitude]);
    const rhumbBearingInDegrees = turf.rhumbBearing(point1, point2);
    const rhumbBearingInRadians = turf.helpers.degreesToRadians(
        rhumbBearingInDegrees
    );
    return {
        rhumbBearingInDegrees,
        rhumbBearingInRadians
    };
};

// what is the difference between this and getWorldRotation()
export const getCameraPosition = camera => {
    // not sure why i should do this, copied from somewhere
    camera.position.setFromMatrixPosition(camera.matrixWorld);
    // get camera position
    const cameraPos = new THREE.Vector3(0, 0, 0);
    cameraPos.applyMatrix4(camera.matrixWorld);
    return cameraPos;
};

export const calibrateObject = (
    object,
    cameraPos,
    currentLocation,
    initialHeading
) => {
    // get distance from current geolocation to the object geolocation
    const { distanceInKilometers } = getDistance(
        currentLocation.coords,
        object
    );

    // convert into meters since arkit is in meters i think
    const distanceInMeters = distanceInKilometers * 1000;

    // bearing is used to find a new point at a distance and an angle from starting coordinates
    const { bearingInDegrees } = getBearing(currentLocation.coords, object);

    // adjust bearing based on the heading that arkit three.js space likely initialized at
    const correctedBearingInDegrees =
        bearingInDegrees - initialHeading.trueHeading;

    // converting bearing to radians is required for Math.cos and Math.sin
    const correctedBearingInRadians = turf.helpers.degreesToRadians(
        correctedBearingInDegrees
    );

    // take the current camera pos and add the distance from current geolocation to object geolocation
    // camera position is the best guess of where we are, current geolocation to three.js position
    // camera position can be not in synce with current geolocation if geo is not updating when we move
    // TODO: perhaps finding a geolocation from the initial geolocation and the camera position's distance from origin is better
    object.object3D.position.z =
        cameraPos.z +
        -1 * Math.cos(correctedBearingInRadians) * distanceInMeters;
    object.object3D.position.x =
        cameraPos.x + Math.sin(correctedBearingInRadians) * distanceInMeters;
};

export const placeObjectFromCamera = (camera, object, distanceInMeters) => {
    const position = getCameraPosition(camera);
    const rotation = camera.getWorldRotation();
    placeObject(object, position, rotation, distanceInMeters);
};

// push object from position at angle
export const placeObject = (object, position, rotation, distanceInMeters) => {
    object.position.copy(position);
    const { x, y, z } = calculatePosition(
        distanceInMeters,
        rotation.y,
        rotation.x
    );
    object.translateX(-1 * z);
    object.translateY(y);
    object.translateZ(-1 * x);
};

// position given two angles and a distance
// https://math.stackexchange.com/questions/1385137/calculate-3d-vector-out-of-two-angles-and-vector-length
export const calculatePosition = (r, betaAngle, alphaAngle) => {
    const x = r * Math.cos(betaAngle) * Math.cos(alphaAngle);
    const y = r * Math.cos(betaAngle) * Math.sin(alphaAngle);
    const z = r * Math.sin(betaAngle);
    return { x, y, z };
};

export const castPoint = ({ locationX: x, locationY: y }) => {
    let touch = new THREE.Vector2();
    touch.set(x / width * 2 - 1, -(y / height) * 2 + 1);
    return touch;
};
