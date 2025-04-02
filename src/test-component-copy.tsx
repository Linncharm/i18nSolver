import React, { useState } from 'react';
import {
  Button,
  Combobox,
  ClipboardButton,
  TooltipContent,
  InstallButton,
  toast,
} from './components/components';

const ExampleComponent: React.FC = () => {
  const [targetLanguage, setTargetLanguage] = useState('');
  const translations = ['Hello', 'World'];

  const handleTargetLanguageChange = (value: string) => {
    setTargetLanguage(value);
  };

  const getLanguageOptions = (includeAuto: boolean) => {
    return [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' },
    ];
  };

  const showToast = (message: string) => {
    toast({
      variant: 'destructive',
      title: 'Error Occurred',
      description: 'Image size is too large. Please select a smaller image.',
    });
  };

  const steps = [
    { id: 1, title: 'Upload Image', desc: 'Click here to upload your image' },
    { id: 2, title: 'Select Language', desc: 'Click to select target language' },
    { id: 3, title: 'Select Service', desc: 'Click to select service' },
    { id: 4, title: 'Success', desc: 'Translation completed successfully' },
  ];

  return (
    <div id="grandparent">
      Welcome to the translation tool
      <h2>Image Translation Service</h2>
      <div>
        <InstallButton>Start Installation</InstallButton>
      </div>
      <span>Please follow the steps below</span>
      <div>
        <Button>
          {
            <>
              fragment
              <span>span</span>
            </>
          }
        </Button>
      </div>
      <div>
        <Combobox
          options={getLanguageOptions(false)}
          value={targetLanguage}
          onValueChange={handleTargetLanguageChange}
          placeholder="Select a language"
          searchPlaceholder="Search for a language"
          emptyText="No language found"
          className="w-[180px]"
        />
      </div>
      <div>
        <div>
          <ClipboardButton
            text={translations[0]}
            tooltipCopy="Copy translation"
            tooltipCopied="Copied!"
          />
        </div>
      </div>
      <div>
        <div>
          <div>
            <TooltipContent>
              <p>Play audio</p>
            </TooltipContent>
          </div>
          <div>
            <TooltipContent>
              <p>Play audio</p>
            </TooltipContent>
          </div>
          <div>
            <TooltipContent>
              <p>Play audio</p>
            </TooltipContent>
          </div>
          <div>
            <TooltipContent>
              <p>Play audio</p>
            </TooltipContent>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleComponent;