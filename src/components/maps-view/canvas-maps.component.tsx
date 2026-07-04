import { Empty, Flex, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AsyncStatus } from '../../shared/enums/async-status.enum';
import { useResizeObserver } from '../../shared/hooks/useResizeObserver';
import styles from './canvas-maps.module.scss';
import type { MapKey } from './enums/map-key.enum';
import { useCanvasMaps2DCamera } from './hooks/useCanvasMaps2DCamera';
import { useCanvasMaps3DCamera } from './hooks/useCanvasMaps3DCamera';
import { FRUSTUM_RADIUS } from './maps-view.constants';
import type { TBodMapItem } from './maps-view.types';

type TProps = {
  maps: Array<TBodMapItem>;
  selectedMaps: Array<MapKey>;
  mapsColors: Record<MapKey, `#${string}`>;
  setCursorPosition: (position: { x: number; y: number }) => void;
  is3DView: boolean;
};

export function CanvasMaps({
  maps,
  selectedMaps,
  mapsColors,
  setCursorPosition,
  is3DView,
}: TProps) {
  const rendererContainerRef = useRef<HTMLDivElement>(null);
  const camera2DRef = useRef<THREE.OrthographicCamera>(null);
  const camera2DTargetRef = useRef<THREE.Vector3>(
    useMemo(() => new THREE.Vector3(0, 0, 0), []),
  );
  const camera3DRef = useRef<THREE.PerspectiveCamera>(null);
  const activeCameraRef = useRef<THREE.Camera>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const loaderRef = useRef<GLTFLoader>(null);
  const animationFrameIdRef = useRef<number>(null);
  const maps3DObjectsRef =
    useRef<Map<MapKey, THREE.Group<THREE.Object3DEventMap>>>(null);

  const leftJoystickRef = useRef<HTMLDivElement>(null);
  const leftHandleRef = useRef<HTMLDivElement>(null);
  const rightJoystickRef = useRef<HTMLDivElement>(null);
  const rightHandleRef = useRef<HTMLDivElement>(null);

  const [loadingStatus, setLoadingStatus] = useState(AsyncStatus.Idle);

  const requestRender = () => {
    animationFrameIdRef.current &&
      window.cancelAnimationFrame(animationFrameIdRef.current);

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      if (
        !activeCameraRef.current ||
        !rendererRef.current ||
        !sceneRef.current
      ) {
        return;
      }
      rendererRef.current.render(sceneRef.current, activeCameraRef.current);
    });
  };

  const callbackRefs = useRef({ setCursorPosition, requestRender });
  callbackRefs.current.setCursorPosition = setCursorPosition;
  callbackRefs.current.requestRender = requestRender;

  useEffect(() => {
    const container = rendererContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(0, 0, false);
    container.appendChild(renderer.domElement);

    loaderRef.current = new GLTFLoader();
    maps3DObjectsRef.current = new Map();

    return () => {
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
    const camera2D = camera2DRef.current;
    const camera3D = camera3DRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!renderer || !scene) return;

    if (camera3D) {
      camera3D.aspect = width / height;
      camera3D.updateProjectionMatrix();
    }

    if (camera2D) {
      const aspect = width / height;

      camera2D.left = -FRUSTUM_RADIUS * aspect;
      camera2D.right = FRUSTUM_RADIUS * aspect;
      camera2D.top = FRUSTUM_RADIUS;
      camera2D.bottom = -FRUSTUM_RADIUS;

      camera2D.updateProjectionMatrix();
    }
    renderer.setSize(width, height, false);
    callbacks.requestRender();
  }, []);

  useResizeObserver(rendererContainerRef, handleResize);

  camera2DRef.current = useCanvasMaps2DCamera(
    rendererRef,
    callbackRefs,
    camera2DTargetRef,
    !is3DView,
  );
  camera3DRef.current = useCanvasMaps3DCamera(
    rendererRef,
    sceneRef,
    camera2DRef.current.position,
    camera2DTargetRef.current,
    {
      leftJoystickRef,
      leftHandleRef,
      rightJoystickRef,
      rightHandleRef,
    },
    is3DView,
  );

  activeCameraRef.current = is3DView
    ? camera3DRef.current
    : camera2DRef.current;

  return (
    <>
      <div
        ref={rendererContainerRef}
        className={`${styles.rendererContainer} ${is3DView ? styles.rendererContainer3D : ''}`}
        style={{
          display: loadingStatus === AsyncStatus.Success ? 'block' : 'none',
        }}
      >
        <div
          ref={leftJoystickRef}
          className={`${styles.joystickContainer} ${styles.leftJoystick}`}
          style={{ display: is3DView ? undefined : 'none' }}
        >
          <div ref={leftHandleRef} className={styles.joystickHandle}></div>
        </div>
        <div
          ref={rightJoystickRef}
          className={`${styles.joystickContainer} ${styles.rightJoystick}`}
          style={{ display: is3DView ? undefined : 'none' }}
        >
          <div ref={rightHandleRef} className={styles.joystickHandle}></div>
        </div>
      </div>
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
