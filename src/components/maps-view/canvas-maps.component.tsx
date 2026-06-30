import { Empty, Flex, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AsyncStatus } from '../../shared/enums/async-status.enum';
import { useResizeObserver } from '../../shared/hooks/useResizeObserver';
import styles from './canvas-maps.module.scss';
import type { MapKey } from './enums/map-key.enum';
import type { TBodMapItem } from './maps-view.types';

const FRUSTUM_RADIUS = 200;
const ZOOM_SPEED = 0.05;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10.0;

type TProps = {
  maps: Array<TBodMapItem>;
  selectedMaps: Array<MapKey>;
  mapsColors: Record<MapKey, `#${string}`>;
  setCursorPosition: (position: { x: number; y: number }) => void;
};

export function CanvasMaps({
  maps,
  selectedMaps,
  mapsColors,
  setCursorPosition,
}: TProps) {
  const rendererContainerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const cameraTargetRef = useRef<THREE.Vector3>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const loaderRef = useRef<GLTFLoader>(null);
  const animationFrameIdRef = useRef<number>(null);
  const maps3DObjectsRef =
    useRef<Map<MapKey, THREE.Group<THREE.Object3DEventMap>>>(null);

  const [loadingStatus, setLoadingStatus] = useState(AsyncStatus.Idle);

  const requestRender = () => {
    animationFrameIdRef.current &&
      window.cancelAnimationFrame(animationFrameIdRef.current);

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      if (
        !cameraRef.current ||
        !rendererRef.current ||
        !sceneRef.current ||
        !cameraTargetRef.current
      ) {
        return;
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    });
  };

  const callbackRefs = useRef({ setCursorPosition, requestRender });
  callbackRefs.current.setCursorPosition = setCursorPosition;
  callbackRefs.current.requestRender = requestRender;

  useEffect(() => {
    const container = rendererContainerRef.current;
    if (!container) return;

    const callbacks = callbackRefs.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(
      -FRUSTUM_RADIUS,
      FRUSTUM_RADIUS,
      FRUSTUM_RADIUS,
      -FRUSTUM_RADIUS,
      1,
      1000,
    );
    cameraRef.current = camera;
    camera.position.set(0, 100, 0);
    cameraTargetRef.current = new THREE.Vector3(0, 0, 0);
    camera.lookAt(cameraTargetRef.current); // Смотрим строго вниз на центр сетки

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    container.appendChild(renderer.domElement);

    loaderRef.current = new GLTFLoader();
    maps3DObjectsRef.current = new Map();

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

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.addEventListener('touchstart', handleTouchStart);
      container.addEventListener('touchmove', handleTouchMove);
      container.addEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMoveInContainer);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const loader = loaderRef.current;
    const scene = sceneRef.current;
    if (!loader || !scene) return;

    const callbacks = callbackRefs.current;

    const createdMaterials: Array<THREE.LineBasicMaterial> = [];

    setLoadingStatus(AsyncStatus.InProgress);

    const loadingPromises = maps.map((map) =>
      loader.loadAsync(map.objLoadPath).then((gltf) => {
        gltf.scene.traverse((child) => {
          // Blender импортирует loose edges как стандартные объекты THREE.LineSegments
          if (child instanceof THREE.LineSegments) {
            child.material = new THREE.LineBasicMaterial({
              color: 0x000000,
            });
            createdMaterials.push(child.material);
          }
        });

        if (!maps3DObjectsRef.current) {
          throw Error('maps3DObjectsRef is empty!');
        }

        maps3DObjectsRef.current.set(map.key, gltf.scene);
      }),
    );

    Promise.all(loadingPromises)
      .then(() => {
        callbacks.requestRender();
        setLoadingStatus(AsyncStatus.Success);
      })
      .catch(() => setLoadingStatus(AsyncStatus.Failed));

    return () => {
      createdMaterials.forEach((mat) => {
        mat.dispose();
      });
    };
  }, [maps]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (
      !scene ||
      !maps3DObjectsRef.current ||
      loadingStatus !== AsyncStatus.Success
    ) {
      return;
    }

    const callbacks = callbackRefs.current;

    maps3DObjectsRef.current.forEach((obj, key) => {
      if (selectedMaps.includes(key) && !obj.parent) {
        scene.add(obj);
      } else if (!selectedMaps.includes(key) && obj.parent === scene) {
        scene.remove(obj);
      }
    });
    callbacks.requestRender();
  }, [selectedMaps, loadingStatus]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (
      !scene ||
      !maps3DObjectsRef.current ||
      loadingStatus !== AsyncStatus.Success
    ) {
      return;
    }

    const callbacks = callbackRefs.current;

    maps3DObjectsRef.current.forEach((obj, key) => {
      obj.traverse((child) => {
        if (
          child instanceof THREE.LineSegments &&
          child.material &&
          child.material.color instanceof THREE.Color
        ) {
          child.material.color.set(mapsColors[key]);
        }
      });
    });
    callbacks.requestRender();
  }, [mapsColors, loadingStatus]);

  const handleResize = useCallback<ResizeObserverCallback>((entries) => {
    if (!entries || entries.length === 0) return;

    const callbacks = callbackRefs.current;

    const { width, height } = entries[0].contentRect;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!camera || !renderer || !scene) return;

    const aspect = width / height;

    camera.left = -FRUSTUM_RADIUS * aspect;
    camera.right = FRUSTUM_RADIUS * aspect;
    camera.top = FRUSTUM_RADIUS;
    camera.bottom = -FRUSTUM_RADIUS;

    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    callbacks.requestRender();
  }, []);

  useResizeObserver(rendererContainerRef, handleResize);

  return (
    <>
      <div
        ref={rendererContainerRef}
        className={styles.rendererContainer}
        style={{
          display: loadingStatus === AsyncStatus.Success ? 'block' : 'none',
        }}
      />
      {loadingStatus === AsyncStatus.InProgress && (
        <Flex
          align="center"
          justify="center"
          gap="medium"
          style={{ height: '100%' }}
        >
          <Spin size="large" />
        </Flex>
      )}
      {loadingStatus === AsyncStatus.Failed && (
        <Flex
          align="center"
          justify="center"
          gap="medium"
          style={{ height: '100%' }}
        >
          <Empty description="Loading error. Try to refresh the page." />
        </Flex>
      )}
    </>
  );
}
