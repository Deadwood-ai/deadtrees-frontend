import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, message, Modal } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useDatasetById } from "../hooks/useDatasets";
import { useTileSessionLock, useSetTileSessionLock, useClearTileSessionLock } from "../hooks/useMLTiles";
import { useAuth } from "../hooks/useAuthProvider";
import MLTileUnifiedView from "../components/MLTiles/MLTileUnifiedView";

export default function DatasetMLTiles() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const datasetId = id ? parseInt(id, 10) : undefined;
  const { data: dataset } = useDatasetById(datasetId);

  const { data: sessionLock } = useTileSessionLock(dataset?.id);
  const { mutateAsync: setLock } = useSetTileSessionLock();
  const { mutateAsync: clearLock } = useClearTileSessionLock();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Acquire lock once on mount; clear on unmount
  const lockAcquiredRef = useRef(false);
  useEffect(() => {
    if (!dataset?.id || !user?.id) return;

    // If another user holds the lock, navigate away
    if (sessionLock?.is_locked && sessionLock.locked_by && sessionLock.locked_by !== user.id) {
      message.error("Another user is currently editing tiles for this dataset");
      navigate("/dataset-audit");
      return;
    }

    if (!lockAcquiredRef.current) {
      setLock(dataset.id)
        .then(() => {
          lockAcquiredRef.current = true;
        })
        .catch((err) => {
          console.error("Failed to acquire lock:", err);
          message.error("Could not start tile generation session");
          navigate("/dataset-audit");
        });
    }

    return () => {
      if (lockAcquiredRef.current) {
        clearLock(dataset.id);
        lockAcquiredRef.current = false;
      }
    };
  }, [dataset?.id, user?.id, sessionLock?.is_locked, sessionLock?.locked_by, setLock, clearLock, navigate]);

  // Handle navigation away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: "Unsaved Changes",
        content: "You have unsaved changes. Are you sure you want to leave?",
        okText: "Leave",
        cancelText: "Stay",
        onOk: () => {
          if (dataset?.id) {
            clearLock(dataset.id);
          }
          navigate(-1);
        },
      });
    } else {
      if (dataset?.id) {
        clearLock(dataset.id);
      }
      navigate(-1);
    }
  };

  if (!dataset) {
    return <div className="p-6">Loading dataset...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack} />
          <div>
            <div className="text-lg font-semibold">ML Training Tiles</div>
            <div className="text-sm text-gray-500">Dataset {dataset.id}</div>
          </div>
        </div>
      </div>

      <MLTileUnifiedView dataset={dataset} onUnsavedChanges={setHasUnsavedChanges} />
    </div>
  );
}
