import { type RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import {
  CAMERA_FAR,
  CAMERA_INIT_POSITION_Y,
  CAMERA_NEAR,
  FRUSTUM_RADIUS,
  JOYSTICK_RADIUS,
} from '../maps-view.constants';

export function useCanvasMaps3DCamera(
  rendererRef: RefObject<THREE.WebGLRenderer | null>,
  sceneRef: RefObject<THREE.Scene | null>,
  cameraPosition: THREE.Vector3,
  cameraTarget: THREE.Vector3,
  joystickRefs: {
    leftJoystickRef: RefObject<HTMLDivElement | null>;
    leftHandleRef: RefObject<HTMLDivElement | null>;
    rightJoystickRef: RefObject<HTMLDivElement | null>;
    rightHandleRef: RefObject<HTMLDivElement | null>;
  },
  enable: boolean,
): THREE.PerspectiveCamera {
  const cameraRef = useRef<THREE.PerspectiveCamera>(
    useMemo(
      () => new THREE.PerspectiveCamera(120, 1, CAMERA_NEAR, CAMERA_FAR),
      [],
    ),
  );
  const timerRef = useRef<THREE.Timer>(null);
  const controlsRef = useRef<FlyControls>(null);
  const animationFrameIdRef = useRef<number>(null);
  const mobileInputRef = useRef({
    forward: 0,
    back: 0,
    left: 0,
    right: 0,
    mouseX: 0,
    mouseY: 0,
  });

  // Вспомогательные 3D-объекты для вращения (вынесены во внешние рефы, чтобы не пересоздавать в цикле)
  const rotationHelpersRef = useRef(
    useMemo(
      () => ({
        targetRotationX: new THREE.Quaternion(),
        targetRotationY: new THREE.Quaternion(),
        xAxis: new THREE.Vector3(1, 0, 0),
        yAxis: new THREE.Vector3(0, 1, 0),
        forwardVector: new THREE.Vector3(),
        rightVector: new THREE.Vector3(),
      }),
      [],
    ),
  );

  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer) return;

    const controls = new FlyControls(camera, renderer.domElement);
    controlsRef.current = controls;

    controls.movementSpeed = 32;
    controls.rollSpeed = Math.PI / 8;
    controls.autoForward = false;

    timerRef.current = new THREE.Timer();

    const leftJoystick = joystickRefs.leftJoystickRef.current;
    const rightJoystick = joystickRefs.rightJoystickRef.current;
    const leftHandle = joystickRefs.leftHandleRef.current;
    const rightHandle = joystickRefs.rightHandleRef.current;
    const mobileInput = mobileInputRef.current;

    if (!leftJoystick || !rightJoystick || !leftHandle || !rightHandle) {
      return;
    }

    // ----------------------------------------------------
    // ЛОГИКА ДЖОЙСТИКОВ (ДЛЯ МОБИЛЬНЫХ)
    // ----------------------------------------------------
    const setupJoystick = (
      container: HTMLElement,
      handle: HTMLElement,
      onMove: (x: number, y: number) => void,
      onEnd: () => void,
    ): [
      (e: TouchEvent) => void,
      (e: TouchEvent) => void,
      (e: TouchEvent) => void,
    ] => {
      let touchId: number | null = null;

      const handleTouchStart = (e: TouchEvent) => {
        if (touchId !== null) return;
        const touch = e.changedTouches[0];
        touchId = touch.identifier;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (touchId === null) return;
        const touch = Array.from(e.touches).find(
          (t) => t.identifier === touchId,
        );
        if (!touch) return;

        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Вычисляем смещение пальца от центра джойстика
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;

        // Ограничиваем ход джойстика радиусом
        const distance = Math.min(
          JOYSTICK_RADIUS,
          Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        );
        const angle = Math.atan2(deltaY, deltaX);

        const moveX = Math.cos(angle) * distance;
        const moveY = Math.sin(angle) * distance;

        handle.style.transform = `translate(${moveX}px, ${moveY}px)`;

        // Передаем нормализованные значения (-1 до 1) в коллбек
        onMove(moveX / JOYSTICK_RADIUS, moveY / JOYSTICK_RADIUS);
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (touchId === null) return;
        const touch = Array.from(e.changedTouches).find(
          (t) => t.identifier === touchId,
        );
        if (!touch && e.type !== 'touchend') return;

        touchId = null;
        handle.style.transform = 'translate(0px, 0px)';
        onEnd();
      };

      return [handleTouchStart, handleTouchMove, handleTouchEnd];
    };

    const minMoveLimit = 0.3;

    // Левый джойстик: отвечает за перемещение (WASD)
    const [handleTouchStartLeft, handleTouchMoveLeft, handleTouchEndLeft] =
      setupJoystick(
        leftJoystick,
        leftHandle,
        (x, y) => {
          mobileInput.forward = y < -minMoveLimit ? -y : 0;
          mobileInput.back = y > minMoveLimit ? y : 0;
          mobileInput.right = x > minMoveLimit ? x : 0;
          mobileInput.left = x < -minMoveLimit ? -x : 0;
        },
        () => {
          mobileInput.forward = 0;
          mobileInput.back = 0;
          mobileInput.left = 0;
          mobileInput.right = 0;
        },
      );

    // Правый джойстик: отвечает за направление взгляда (Мышь)
    const [handleTouchStartRight, handleTouchMoveRight, handleTouchEndRight] =
      setupJoystick(
        rightJoystick,
        rightHandle,
        (x, y) => {
          mobileInput.mouseX = x;
          mobileInput.mouseY = y;
        },
        () => {
          mobileInput.mouseX = 0;
          mobileInput.mouseY = 0;
        },
      );

    leftJoystick.addEventListener('touchstart', handleTouchStartLeft);
    leftJoystick.addEventListener('touchmove', handleTouchMoveLeft);
    leftJoystick.addEventListener('touchend', handleTouchEndLeft);
    leftJoystick.addEventListener('touchcancel', handleTouchEndLeft);

    rightJoystick.addEventListener('touchstart', handleTouchStartRight);
    rightJoystick.addEventListener('touchmove', handleTouchMoveRight);
    rightJoystick.addEventListener('touchend', handleTouchEndRight);
    rightJoystick.addEventListener('touchcancel', handleTouchEndRight);

    return () => {
      timerRef.current?.dispose();
      controls.dispose();
      leftJoystick.removeEventListener('touchstart', handleTouchStartLeft);
      leftJoystick.removeEventListener('touchmove', handleTouchMoveLeft);
      leftJoystick.removeEventListener('touchend', handleTouchEndLeft);
      leftJoystick.removeEventListener('touchcancel', handleTouchEndLeft);

      rightJoystick.removeEventListener('touchstart', handleTouchStartRight);
      rightJoystick.removeEventListener('touchmove', handleTouchMoveRight);
      rightJoystick.removeEventListener('touchend', handleTouchEndRight);
      rightJoystick.removeEventListener('touchcancel', handleTouchEndRight);
    };
  }, [
    rendererRef.current,
    joystickRefs.leftHandleRef.current,
    joystickRefs.leftJoystickRef.current,
    joystickRefs.rightHandleRef.current,
    joystickRefs.rightJoystickRef.current,
  ]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const timer = timerRef.current;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !timer || !controls || !camera) return;

    if (enable) {
      camera.position.set(
        cameraPosition.x,
        CAMERA_INIT_POSITION_Y / (CAMERA_FAR / FRUSTUM_RADIUS),
        cameraPosition.z,
      );
      camera.lookAt(cameraTarget);
      timer.reset();

      const mobileInput = mobileInputRef.current;

      const animate = () => {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        timer.update();
        const delta = timer.getDelta();

        if (
          mobileInput.forward ||
          mobileInput.back ||
          mobileInput.left ||
          mobileInput.right ||
          mobileInput.mouseX ||
          mobileInput.mouseY
        ) {
          // Эмуляция WASD перемещения через векторы камеры
          const actualSpeed = controls.movementSpeed * delta;
          const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(
            camera.quaternion,
          );
          const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(
            camera.quaternion,
          );

          if (mobileInput.forward)
            camera.position.addScaledVector(
              forwardVector,
              actualSpeed * mobileInput.forward,
            );
          if (mobileInput.back)
            camera.position.addScaledVector(
              forwardVector,
              -actualSpeed * mobileInput.back,
            );
          if (mobileInput.right)
            camera.position.addScaledVector(
              rightVector,
              actualSpeed * mobileInput.right,
            );
          if (mobileInput.left)
            camera.position.addScaledVector(
              rightVector,
              -actualSpeed * mobileInput.left,
            );

          // Эмуляция движения мыши (вращение)
          const actualRollSpeed = controls.rollSpeed * delta;

          const helpers = rotationHelpersRef.current;

          helpers.forwardVector
            .set(0, 0, -1)
            .applyQuaternion(camera.quaternion);
          helpers.rightVector.set(1, 0, 0).applyQuaternion(camera.quaternion);

          // Вращение влево/вправо вокруг МИРОВОЙ оси Y (0, 1, 0)
          helpers.targetRotationY.setFromAxisAngle(
            helpers.yAxis,
            -mobileInput.mouseX * actualRollSpeed,
          );
          camera.quaternion.premultiply(helpers.targetRotationY);

          // Вращение вверх/вниз вокруг ЛОКАЛЬНОЙ оси X камеры (1, 0, 0)
          helpers.targetRotationX.setFromAxisAngle(
            helpers.xAxis,
            -mobileInput.mouseY * actualRollSpeed,
          );
          camera.quaternion.multiply(helpers.targetRotationX);

          // Сброс крена (Z-ось), чтобы горизонт оставался идеально ровным
          const euler = new THREE.Euler().setFromQuaternion(
            camera.quaternion,
            'YXZ',
          );
          euler.z = 0;
          camera.quaternion.setFromEuler(euler);
        } else {
          controls.update(delta);
        }
        renderer.render(scene, camera);
      };
      animate();
    } else {
      animationFrameIdRef.current &&
        cancelAnimationFrame(animationFrameIdRef.current);
    }
    return () => {
      animationFrameIdRef.current &&
        cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [
    rendererRef.current,
    sceneRef.current,
    enable,
    cameraPosition,
    cameraTarget,
  ]);

  return cameraRef.current;
}
