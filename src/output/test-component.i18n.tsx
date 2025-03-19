import React, { useState } from "react";
import {
  Button,
  Combobox,
  ClipboardButton,
  TooltipContent,
  InstallButton,
  toast,
} from "./components/components";

const ExampleComponent: React.FC = () => {
  const [targetLanguage, setTargetLanguage] = useState("");
  const translations = ["Hello", "World"];

  const handleTargetLanguageChange = (value: string) => {
    setTargetLanguage(value);
  };

  const getLanguageOptions = (includeAuto: boolean) => {
    return [
      { value: "en", label: "English" },
      { value: "es", label: "Spanish" },
      { value: "fr", label: "French" },
    ];
  };

  const showToast = (message: string) => {
    toast({
      variant: "destructive",
      title: t("toastTitle"),
      description: t("toastDescription"),
    });
  };

  const steps = [
    { id: 1, title: t("stepsTitle1"), desc: t("stepsDesc1") },
    { id: 2, title: t("stepsTitle2"), desc: t("stepsDesc2") },
    { id: 3, title: t("stepsTitle3"), desc: t("stepsDesc3") },
    { id: 4, title: t("stepsTitle4"), desc: t("stepsDesc4") },
  ];

  return (
    <div id="grandparent">
      {t("AreaText1")}

      <h2>{t("AreaTitle1")}</h2>
      <div>
        <InstallButton>{t("AreaInstallButton1")}</InstallButton>
      </div>
      <span>{t("AreaText2")}</span>
      <div>
        <Button>
          {
            <>
              {t("AreaText4")}

              <span>{t("AreaText3")}</span>
            </>
          }
        </Button>
      </div>
      <div>
        <Combobox
          options={getLanguageOptions(false)}
          value={targetLanguage}
          onValueChange={handleTargetLanguageChange}
          placeholder={t("AreaComboboxPlaceholder1")}
          searchPlaceholder={t("AreaComboboxSearchPlaceholder1")}
          emptyText={t("AreaComboboxEmptyText1")}
          className="w-[180px]"
        />
      </div>
      <div>
        <div>
          <ClipboardButton
            text={translations[0]}
            tooltipCopy={t("AreaClipboardButtonTooltipCopy1")}
            tooltipCopied={t("AreaClipboardButtonTooltipCopied1")}
          />
        </div>
      </div>
      <div>
        <div>
          <div>
            <TooltipContent>
              <p>{t("AreaSubtitle1")}</p>
            </TooltipContent>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleComponent;
