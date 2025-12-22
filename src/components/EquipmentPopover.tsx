// @ts-nocheck
import React, { useState } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
} from "@floating-ui/react";

const EquipmentPopover = ({
  isOpen,
  onClose,
  onApply,
  referenceElement,
  selectedEquipment = [],
  equipmentOptions = [],
  loading = false,
}) => {
  const [localSelected, setLocalSelected] = useState(selectedEquipment);

  // Update localSelected when selectedEquipment changes (when popover opens)
  React.useEffect(() => {
    setLocalSelected(selectedEquipment);
  }, [selectedEquipment]);

  const { refs, floatingStyles } = useFloating({
    elements: {
      reference: referenceElement,
    },
    open: isOpen,
    onOpenChange: onClose,
    placement: "bottom-start",
    middleware: [
      offset({ mainAxis: 8, crossAxis: 0 }),
      flip({
        fallbackAxisSideDirection: "start",
        padding: 16,
      }),
      shift({ padding: 16 }),
      size({
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.min(availableWidth, 360)}px`,
            maxHeight: `${Math.min(availableHeight, 500)}px`,
          });
        },
        padding: 16,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Group equipment by category from API data
  const equipmentCategories = equipmentOptions.reduce((acc, equipment) => {
    const category = equipment.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({
      id: equipment.id,
      name: equipment.name,
      available: equipment.available,
    });
    return acc;
  }, {});

  const handleEquipmentToggle = (equipmentId) => {
    setLocalSelected((prev) => {
      if (prev.includes(equipmentId)) {
        return prev.filter((item) => item !== equipmentId);
      } else {
        return [...prev, equipmentId];
      }
    });
  };

  const handleApply = () => {
    onApply(localSelected);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelected(selectedEquipment);
    onClose();
  };

  const handleSelectAll = () => {
    const allEquipment = equipmentOptions.map((equipment) => equipment.id);
    setLocalSelected(allEquipment);
  };

  const handleDeselectAll = () => {
    setLocalSelected([]);
  };

  // Close popover when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        refs.floating.current &&
        !refs.floating.current.contains(event.target) &&
        referenceElement &&
        !referenceElement.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, referenceElement, refs.floating]);

  if (!isOpen) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        zIndex: 1000,
        backgroundColor: "#1F1F20",
        border: "1px solid #333333",
        borderRadius: "8px",
        padding: "20px",
        fontFamily: "Inter, sans-serif",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
        minWidth: "320px",
        maxWidth: "360px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            color: "#9CA3AF",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              border: "2px solid #333333",
              borderTop: "2px solid #FDCE06",
              borderRadius: "50%",
              marginBottom: "12px",
              animation: "spin 1s linear infinite",
            }}
          />
          <span>Loading equipment list...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#E5E5E5",
                  fontSize: "18px",
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Select Equipment
              </h3>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#9CA3AF",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {localSelected.length} of {equipmentOptions.length} equipment selected
            </div>
            <div
              style={{ display: "flex", gap: "8px" }}
              className="whitespace-nowrap"
            >
              <button
                onClick={handleSelectAll}
                className="whitespace-nowrap text-[12px]"
                style={{
                  padding: "4px 8px",
                  backgroundColor: "transparent",
                  border: "1px solid #FDCE06",
                  borderRadius: "4px",
                  color: "#FDCE06",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#FDCE06";
                  e.target.style.color = "#1F1F20";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#FDCE06";
                }}
              >
                Select All
              </button>
              <button
                className="whitespace-nowrap text-[12px]"
                onClick={handleDeselectAll}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "transparent",
                  border: "1px solid #9CA3AF",
                  borderRadius: "4px",
                  color: "#9CA3AF",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#9CA3AF";
                  e.target.style.color = "#1F1F20";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#9CA3AF";
                }}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Equipment Categories */}
          <div
            style={{ marginBottom: "24px", maxHeight: "300px", overflowY: "auto" }}
          >
            {Object.entries(equipmentCategories).map(([category, items]) => (
              <div key={category} style={{ marginBottom: "20px" }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#FDCE06",
                    fontSize: "16px",
                    fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {category}
                </h4>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  {items.map((equipment) => (
                    <label
                      key={equipment.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                        padding: "8px 0",
                        transition: "all 0.2s ease",
                        opacity: equipment.available ? 1 : 0.6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={localSelected.includes(equipment.id)}
                        onChange={() => handleEquipmentToggle(equipment.id)}
                        style={{
                          width: "16px",
                          height: "16px",
                          accentColor: "#FDCE06",
                          cursor: "pointer",
                        }}
                      />
                      <span
                        style={{
                          color: "#E5E5E5",
                          fontSize: "14px",
                          fontFamily: "Inter, sans-serif",
                          userSelect: "none",
                        }}
                      >
                        {equipment.name}
                        {!equipment.available && " (Unavailable)"}
                        {localSelected.includes(equipment.id) && (
                          <span
                            style={{
                              color: "#FDCE06",
                              marginLeft: "8px",
                              fontSize: "12px",
                            }}
                          >
                            (Assigned)
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              borderTop: "1px solid #333333",
              paddingTop: "6px",
            }}
          >
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                border: "1px solid #333333",
                borderRadius: "6px",
                color: "#E5E5E5",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#333333";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              style={{
                padding: "8px 16px",
                backgroundColor: "#FDCE06",
                border: "none",
                borderRadius: "6px",
                color: "#1F1F20",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#E5B800";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#FDCE06";
              }}
            >
              Apply ({localSelected.length})
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EquipmentPopover;
