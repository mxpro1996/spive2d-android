import {
  animationSelector,
  aspectRatioToggle,
  bgColorPicker,
  dialog,
  dirSelector,
  languageSelector,
  originalWidthInput,
  originalHeightInput,
  pmaCheckbox,
  settingSelector,
  sceneSelector,
  windowWidthInput,
  windowHeightInput,
} from "./elements.js";
import { focusBody } from "./events.js";
import { dispose, dirFiles, init, isInit } from "./main.js";
import { resetModelState } from "./model-actions.js";
import { reloadSpine } from "./spine-loader.js";
import {
  currentModel,
  skeletons,
  animationStates,
  modelType,
  opacities,
  setFirstRenderFlag,
  setPremultipliedAlpha,
  setSetting,
} from "./state.js";
import { createSceneSelector, resetSettingUI } from "./ui.js";

const { getCurrentWindow, PhysicalSize } = window.__TAURI__.window;

let checkboxDragging = false;
let checkboxState = false;

export function getModelId() {
  return dirSelector.value + "/" + sceneSelector.value;
}

export function handleLanguageSelectorChange(e) {
  const lang = e.target.value;
  loadTranslations(lang).then(applyTranslations);
  localStorage.setItem("spive2d_language", lang);
  if (languageSelector) languageSelector.value = lang;
}

async function loadTranslations(lang) {
  const response = await fetch(`../locales/${lang}.json`);
  return await response.json();
}

function applyTranslations(translations) {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[key]) element.textContent = translations[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    if (translations[key]) element.placeholder = translations[key];
  });
}

export function initLanguage() {
  const savedLang = localStorage.getItem("spive2d_language") || "en";
  handleLanguageSelectorChange({ target: { value: savedLang } });
}

export function handleSettingSelectorChange(e) {
  setSetting(e.target.value);
  resetSettingUI();
}

export function toggleDialog() {
  if (dialog.open) dialog.close();
  else {
    dialog.showModal();
    if (!isInit) return;
    if (modelType === "live2d") {
      originalWidthInput.value = currentModel.internalModel.originalWidth;
      originalHeightInput.value = currentModel.internalModel.originalHeight;
    } else if (modelType === "spine") {
      originalWidthInput.value = skeletons["0"].skeleton.data.width;
      originalHeightInput.value = skeletons["0"].skeleton.data.height;
    }
  }
}

export function handleWindowWidthChange() {
  if (aspectRatioToggle.checked) {
    const newWidth = Number(windowWidthInput.value);
    const aspectRatio = Number(aspectRatioToggle.value);
    windowHeightInput.value = Math.round(newWidth * aspectRatio);
  }
  validateWindowSize();
  updateWindowSize();
}

export function handleWindowHeightChange() {
  if (aspectRatioToggle.checked) {
    const newHeight = Number(windowHeightInput.value);
    const aspectRatio = Number(aspectRatioToggle.value);
    windowWidthInput.value = Math.round(newHeight / aspectRatio);
  }
  validateWindowSize();
  updateWindowSize();
}

function validateWindowSize() {
  if (windowWidthInput.value < 100) windowWidthInput.value = 100;
  if (windowWidthInput.value > 10000) windowWidthInput.value = 10000;
  if (windowHeightInput.value < 100) windowHeightInput.value = 100;
  if (windowHeightInput.value > 10000) windowHeightInput.value = 10000;
}

function updateWindowSize() {
  const newWidth = Math.round(Number(windowWidthInput.value));
  const newHeight = Math.round(Number(windowHeightInput.value));
  getCurrentWindow().setSize(new PhysicalSize(newWidth, newHeight));
  aspectRatioToggle.value = newHeight / newWidth;
}

export async function handleSetOriginalSize() {
  if (!isInit) return;
  const originalWidth = Math.round(Number(originalWidthInput.value));
  const originalHeight = Math.round(Number(originalHeightInput.value));
  await getCurrentWindow().setSize(new PhysicalSize(originalWidth, originalHeight));
  resetModelState();
}

export function handleColorPickerChange() {
  document.body.style.backgroundColor = bgColorPicker.value;
  document.body.style.backgroundImage = "none";
}

export function handlePMACheckboxChange() {
  setPremultipliedAlpha(pmaCheckbox.checked);
  setFirstRenderFlag(true);
  if (modelType === "spine") reloadSpine();
  focusBody();
}

function navigateAndTriggerChange(selector, delta) {
  const optionsLength = selector.options.length;
  if (optionsLength === 1) return;
  let newIndex = (selector.selectedIndex + delta + optionsLength) % optionsLength;
  selector.selectedIndex = newIndex;
  selector.dispatchEvent(new Event("change"));
}

export function previousDir() { navigateAndTriggerChange(dirSelector, -1); }
export function nextDir() { navigateAndTriggerChange(dirSelector, 1); }
export function previousScene() { navigateAndTriggerChange(sceneSelector, -1); }
export function nextScene() { navigateAndTriggerChange(sceneSelector, 1); }
export function previousAnimation() { navigateAndTriggerChange(animationSelector, -1); }
export function nextAnimation() { navigateAndTriggerChange(animationSelector, 1); }

function findMaxNumberInString(inputString) {
  const numbers = inputString.match(/\d+/g);
  if (numbers === null) return null;
  const numArray = numbers.map(Number);
  const maxNumber = Math.max(...numArray);
  return maxNumber;
}

function setSceneIndexLogic() {
  const sceneIds = dirFiles[dirSelector[dirSelector.selectedIndex].value];
  const maxNumber = findMaxNumberInString(sceneSelector.value);
  createSceneSelector(sceneIds);
  let index = sceneIds.findIndex((item) => item.includes(maxNumber));
  index = index === -1 ? 0 : index;
  sceneSelector.selectedIndex = index;
}

export function handleDirChange() {
  setSceneIndexLogic();
  dispose();
  init();
}

export function handleSceneChange() {
  dispose();
  init();
}

export function handleLive2DAnimationChange(motion, index) {
  currentModel.motion(motion, Number(index), 3);
}

export function handleExpressionChange(e) {
  currentModel.expression("" === e.target.value ? currentModel.internalModel.motionManager.ExpressionManager?.defaultExpression : Number(e.target.value));
}

export function handleSettingMouseDown(e) {
  let checkbox = e.target.closest('input[type="checkbox"]');
  if (!checkbox) {
    const label = e.target.closest('label');
    if (label) checkbox = label.querySelector('input[type="checkbox"]');
  }
  if (!checkbox) return;
  e.preventDefault();
  checkboxDragging = true;
  checkboxState = !checkbox.checked;
  checkbox.checked = checkboxState;
  checkbox.dispatchEvent(new Event("input", { bubbles: true }));
}

export function handleSettingMouseOver(e) {
  if (!checkboxDragging) return;
  let checkbox = e.target.closest('input[type="checkbox"]');
  if (!checkbox) {
    const label = e.target.closest('label');
    if (label) checkbox = label.querySelector('input[type="checkbox"]');
  }
  if (!checkbox) return;
  if (checkbox.checked !== checkboxState) {
    checkbox.checked = checkboxState;
    checkbox.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

export function handleSettingMouseUp() {
  checkboxDragging = false;
}

export function handleSettingClick(e) {
  let checkbox = e.target.closest('input[type="checkbox"]');
  if (!checkbox) {
    const label = e.target.closest('label');
    if (label) checkbox = label.querySelector('input[type="checkbox"]');
  }
  if (!checkbox) return;
  if (e.detail !== 0) e.preventDefault();
}

export function handleParameterSliderChange(e) {
  const inputs = Array.from(
    document.getElementById("parameter").querySelectorAll('input[type="range"]')
  );
  const index = inputs.indexOf(e.target);
  const parameterValues = currentModel.internalModel.coreModel._parameterValues;
  parameterValues[index] = e.target.value;
}

export function handlePartCheckboxChange(e) {
  currentModel.internalModel.coreModel.setPartOpacityById(
    e.target.previousSibling.textContent,
    +e.target.checked
  );
}

export function handleDrawableCheckboxChange(e) {
  if (!opacities) return;
  opacities[Number(e.target.getAttribute("data-old-index"))] =
    +e.target.checked;
  currentModel.internalModel.coreModel._model.drawables.opacities = opacities;
}

export function resetConfiguration() {
  setFirstRenderFlag(true);
  if (modelType === "live2d") {
    setSetting("parameters");
    settingSelector.value = "parameters";
  } else {
    setSetting("attachments");
    settingSelector.value = "attachments";
  }
  settingSelector.disabled = false;
}

function handleSpineAnimationChange(index) {
  const skeleton = skeletons["0"].skeleton;
  const animationName = skeleton.data.animations[index].name;
  for (const animationState of animationStates) {
    animationState.clearTracks();
    skeleton.setToSetupPose();
    animationState.setAnimation(0, animationName, true);
  }
}

export function handleAnimationChange(e) {
  if (modelType === "live2d") {
    const [motion, index] = e.target.value.split(",");
    handleLive2DAnimationChange(motion, index);
  } else {
    handleSpineAnimationChange(e.target.selectedIndex);
  }
}

export function restoreAnimation(animationName) {
  const optionExists = Array.from(animationSelector.options).some(
    (option) => option.value === animationName
  );
  if (optionExists) {
    animationSelector.value = animationName;
    animationSelector.dispatchEvent(new Event("change"));
  }
}
