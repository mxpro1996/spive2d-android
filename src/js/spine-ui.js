import { skin } from "./elements.js";
import { spine } from "./spine-loader.js";
import { attachmentsCache, setAttachmentsCache, skeletons } from "./state.js";
import { getModelId } from "./ui-controls.js";
import { createAttachmentUI, handleFilterInput } from "./ui.js";

export function resetAttachmentsCache() {
  setAttachmentsCache({});
}

function getSkinAttachment(slotIndex, name, defaultSkin, skeleton) {
  const checkSkin = (skin, isDefault) => {
    if (!skin) return null;
    let attachment = skin.getAttachment(slotIndex, name);
    if (attachment) return { attachment, key: name, isDefault };
    const slot = skeleton.slots[slotIndex];
    if (slot && slot.data.attachmentName) {
      const altKey = slot.data.attachmentName;
      const altAtt = skin.getAttachment(slotIndex, altKey);
      if (altAtt && altAtt.name === name) return { attachment: altAtt, key: altKey, isDefault };
    }
    return null;
  };
  const result = checkSkin(skeleton.skin, false) || checkSkin(defaultSkin, true);
  return result || { attachment: null, key: name, isDefault: false };
}

function syncHiddenAttachments() {
  const skeleton = skeletons["0"].skeleton;
  Object.values(attachmentsCache).forEach(([slotIndex, , , skinKey]) => {
    if (skeleton.data.defaultSkin) skeleton.data.defaultSkin.removeAttachment(slotIndex, skinKey);
    if (skeleton.skin) skeleton.skin.removeAttachment(slotIndex, skinKey);
    const slot = skeleton.slots[slotIndex];
    if (slot) slot.attachment = null;
  });
}

export function removeAttachments() {
  const attachmentKeys = Object.keys(attachmentsCache);
  if (attachmentKeys.length > 0) {
    const skeleton = skeletons["0"].skeleton;
    attachmentKeys.forEach((key) => {
      const [name, indexStr] = key.split("##");
      const savedSlotIndex = Number(indexStr);
      const attachmentCheckboxes = document
        .getElementById("attachment")
        .querySelectorAll('input[type="checkbox"]');
      attachmentCheckboxes.forEach((checkbox) => {
        const checkboxIndex = Number(checkbox.getAttribute("data-old-index"));
        const checkboxName = checkbox.parentElement.textContent;
        if (checkboxName === name && checkboxIndex === savedSlotIndex) {
          checkbox.checked = false;
          const defaultSkin = skeleton.data.defaultSkin;
          const { attachment: currentAttachment, key: skinKey, isDefault } = getSkinAttachment(
            savedSlotIndex,
            name,
            defaultSkin,
            skeleton
          );
          if (currentAttachment) {
            attachmentsCache[key] = [savedSlotIndex, currentAttachment, true, skinKey, getModelId(), isDefault];
            if (isDefault) defaultSkin.removeAttachment(savedSlotIndex, skinKey);
            else if (skeleton.skin) skeleton.skin.removeAttachment(savedSlotIndex, skinKey);
          } else {
            const slot = skeleton.slots[savedSlotIndex];
            if (slot && slot.attachment && slot.attachment.name === name) {
              attachmentsCache[key] = [savedSlotIndex, slot.attachment, false, null, getModelId(), false];
              slot.attachment = null;
            }
          }
        }
      });
    });
    skeleton.setToSetupPose();
    syncHiddenAttachments();
  }
}

export function handleAttachmentCheckboxChange(e) {
  const skeleton = skeletons["0"].skeleton;
  const targetCheckbox = e.target.closest('input[type="checkbox"]');
  const name = targetCheckbox.closest("label").getAttribute("title");
  const slotIndex = Number(targetCheckbox.getAttribute("data-old-index"));
  const compositeKey = `${name}##${slotIndex}`;
  const defaultSkin = skeleton.data.defaultSkin;
  if (targetCheckbox.checked) {
    if (attachmentsCache[compositeKey]) {
      const [cachedSlotIndex, cachedAttachment, wasFromSkin, savedSkinKey, , isDefault] = attachmentsCache[compositeKey];
      if (wasFromSkin) {
        if (isDefault) defaultSkin.setAttachment(cachedSlotIndex, savedSkinKey || name, cachedAttachment);
        else if (skeleton.skin) skeleton.skin.setAttachment(cachedSlotIndex, savedSkinKey || name, cachedAttachment);
        skeleton.setToSetupPose();
      } else {
        const slot = skeleton.slots[cachedSlotIndex];
        if (slot) slot.attachment = cachedAttachment;
      }
      delete attachmentsCache[compositeKey];
    }
  } else {
    const { attachment: currentAttachment, key: skinKey, isDefault } = getSkinAttachment(
      slotIndex,
      name,
      defaultSkin,
      skeleton
    );
    if (currentAttachment) {
      attachmentsCache[compositeKey] = [slotIndex, currentAttachment, true, skinKey, getModelId(), isDefault];
      if (isDefault) defaultSkin.removeAttachment(slotIndex, skinKey);
      else if (skeleton.skin) skeleton.skin.removeAttachment(slotIndex, skinKey);
      skeleton.setToSetupPose();
    } else {
      const slot = skeleton.slots[slotIndex];
      if (slot && slot.attachment && slot.attachment.name === name) {
        attachmentsCache[compositeKey] = [slotIndex, slot.attachment, false, null, getModelId(), false];
        slot.attachment = null;
      }
    }
  }
  syncHiddenAttachments();
}

function getCheckedSkinNames() {
  const checkboxes = skin.querySelectorAll("input[type='checkbox']:checked");
  return Array.from(checkboxes).map((checkbox) => checkbox.parentElement.textContent);
}

export function saveSkins() {
  const skinFlags = [];
  const checkedSkinNames = getCheckedSkinNames();
  const allCheckboxes = skin.querySelectorAll("input[type='checkbox']");
  allCheckboxes.forEach((checkbox, index) => {
    skinFlags[index] = checkedSkinNames.includes(checkbox.parentElement.textContent);
  });
  return skinFlags;
}

export function restoreSkins(skinFlags) {
  const checkboxes = skin.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox, index) => {
    if (skinFlags[index] !== undefined) checkbox.checked = skinFlags[index];
  });
  handleSkinCheckboxChange();
}

export function handleSkinCheckboxChange() {
  const skeleton = skeletons["0"].skeleton;
  const checkboxes = skin.querySelectorAll("input[type='checkbox']");
  if (checkboxes.length === 0) {
    syncHiddenAttachments();
    createAttachmentUI();
    handleFilterInput();
    return;
  }
  const newSkin = new spine.Skin("_");
  skeleton.setSkin(null);
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) newSkin.addSkin(skeleton.data.findSkin(checkbox.parentElement.textContent));
  });
  skeleton.setSkin(newSkin);
  skeleton.setToSetupPose();
  const state = skeletons["0"].state;
  state.apply(skeleton);
  skeleton.updateWorldTransform(2);
  syncHiddenAttachments();
  createAttachmentUI();
  handleFilterInput();
}
