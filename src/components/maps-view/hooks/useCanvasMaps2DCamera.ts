import { type RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  CAMERA_FAR,
  CAMERA_INIT_POSITION_Y,
  CAMERA_NEAR,
  FRUSTUM_RADIUS,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_SPEED,
} from '../maps-view.constants';

export function useCanvasMaps2DCamera(
  rendererRef: RefObject<THREE.WebGLRenderer | null>,
  callbackRefs: React.RefObject<{
    setCursorPosition: (position: { x: number; y: number }) => void;
    requestRender: () => void;
  }>,
  cameraTargetRef: RefObject<THREE.Vector3>,
  enable: boolean,
): THREE.OrthographicCamera {
  const cameraRef = useRef<THREE.OrthographicCamera>(
    useMemo(
      () =>
        new THREE.OrthographicCamera(
          -FRUSTUM_RADIUS,
          FRUSTUM_RADIUS,
          FRUSTUM_RADIUS,
          -FRUSTUM_RADIUS,
          CAMERA_NEAR,
          CAMERA_FAR,
        ),
      [],
    ),
  );

  useEffect(() => {
    const camera = cameraRef.current;
    camera.position.set(0, CAMERA_INIT_POSITION_Y, 0);
    camera.lookAt(cameraTargetRef.current);
  }, [cameraTargetRef.current]);

  useEffect(() => {
    const container = rendererRef.current?.domElement.parentElement;
    const camera = cameraRef.current;
    if (!container || !camera || !enable) return;

    const callbacks = callbackRefs.current;

    // --- Состояние для мыши и тач-событий ---
    let isDragging = false;
    let initialTouchDistance = 0;
    let initialCameraZoom = camera.zoom;
    const previousPosition = { x: 0, y: 0 };

    // --- Вспомогательные функции ---
    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Общая логика сдвига камеры для мыши и пальца
    const moveCamera = (deltaX: number, deltaY: number) => {
      if (!cameraTargetRef.current) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      const asp = w / h;

      const worldWidth = (FRUSTUM_RADIUS * asp * 2) / camera.zoom;
      const worldHeight = (FRUSTUM_RADIUS * 2) / camera.zoom;

      const moveX = (deltaX / w) * worldWidth;
      const moveY = (deltaY / h) * worldHeight;

      camera.position.x -= moveX;
      camera.position.z -= moveY;

      cameraTargetRef.current.x -= moveX;
      cameraTargetRef.current.z -= moveY;

      callbacks.requestRender();
    };

    // ==========================================
    // ОБРАБОТЧИКИ ДЛЯ МЫШИ (ПК)
    // ==========================================

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return; // Только левая кнопка
      isDragging = true;
      previousPosition.x = event.clientX;
      previousPosition.y = event.clientY;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - previousPosition.x;
      const deltaY = event.clientY - previousPosition.y;

      previousPosition.x = event.clientX;
      previousPosition.y = event.clientY;

      moveCamera(deltaX, deltaY);
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomFactor = event.deltaY < 0 ? 1 + ZOOM_SPEED : 1 - ZOOM_SPEED;

      camera.zoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, camera.zoom * zoomFactor),
      );
      camera.updateProjectionMatrix();
      callbacks.requestRender();
    };

    // ==========================================
    // ОБРАБОТЧИКИ ДЛЯ ТАЧ-СКРИНА (МОБИЛКИ)
    // ==========================================

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        // Один палец -> Включаем перемещение
        isDragging = true;
        previousPosition.x = event.touches[0].clientX;
        previousPosition.y = event.touches[0].clientY;
      } else if (event.touches.length === 2) {
        // Два пальца -> Отключаем перемещение, включаем зум
        isDragging = false;
        event.preventDefault();

        initialTouchDistance = getTouchDistance(event.touches);
        initialCameraZoom = camera.zoom;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();

      // Сценарий А: Перетаскивание одним пальцем
      if (isDragging && event.touches.length === 1) {
        const currentX = event.touches[0].clientX;
        const currentY = event.touches[0].clientY;

        const deltaX = currentX - previousPosition.x;
        const deltaY = currentY - previousPosition.y;

        previousPosition.x = currentX;
        previousPosition.y = currentY;

        moveCamera(deltaX, deltaY);
      }
      // Сценарий Б: Зум двумя пальцами
      else if (event.touches.length === 2 && initialTouchDistance > 0) {
        const currentDistance = getTouchDistance(event.touches);
        const zoomFactor = currentDistance / initialTouchDistance;

        camera.zoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, initialCameraZoom * zoomFactor),
        );

        camera.updateProjectionMatrix();
        callbacks.requestRender();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        isDragging = false;
        initialTouchDistance = 0;
      } else if (event.touches.length === 1) {
        // Плавный переход: если убрали один палец, продолжаем тащить вторым
        isDragging = true;
        initialTouchDistance = 0;
        previousPosition.x = event.touches[0].clientX;
        previousPosition.y = event.touches[0].clientY;
      }
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Горизонтальная плоскость на высоте Y = 0
    const intersectionPoint = new THREE.Vector3();

    const handleMouseMoveInContainer = (event: MouseEvent) => {
      if (isDragging) return;

      const rect = container.getBoundingClientRect();

      // Локальные координаты мыши внутри вашего блока схемы
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      // Переводим пиксели экрана в нормализованный формат WebGL (от -1 до 1)
      mouse.x = (localX / rect.width) * 2 - 1;
      mouse.y = -(localY / rect.height) * 2 + 1;

      // Настраиваем луч от ортографической камеры через позицию мыши
      raycaster.setFromCamera(mouse, camera);

      // Находим точку пересечения луча с бесконечной горизонтальной плоскостью (Y=0)
      // Это дает идеальные X и Z координаты на вашей схеме
      if (raycaster.ray.intersectPlane(planeY, intersectionPoint)) {
        // ТЕ САМЫЕ КООРДИНАТЫ КУРСОРA В МИРЕ THREE.JS:
        callbacks.setCursorPosition({
          x: intersectionPoint.x,
          y: -intersectionPoint.z,
        });
      }
    };

    // Привязываем событие к контейнеру (с флагом passive: false, чтобы работал preventDefault)
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMoveInContainer);
    // window для move и up гарантирует, что перетаскивание не сломается, если мышь вылетит за пределы холста
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    callbacks.requestRender();

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMoveInContainer);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    callbackRefs.current,
    rendererRef.current,
    enable,
    cameraTargetRef.current,
  ]);

  return cameraRef.current;
}
