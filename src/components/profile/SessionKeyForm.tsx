import React, { useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';

import Box from '@/src/components/shared/Box';
import SessionKeyStep1 from './SessionKeyStep1';
import SessionKeyStep2 from './SessionKeyStep2';
import SessionKeyStep3 from './SessionKeyStep3';
import SessionKeySuccess from './SessionKeySuccess';

interface Props {
  onBack: () => void;
  onComplete: (values: any) => void;
  currentStep: number;
  setStep: (step: number) => void;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Session name is required'),
});

const SessionKeyForm = ({ onBack, onComplete, currentStep, setStep }: Props) => {
  const initialValues = {
    name: '',
    duration: '1 Hour',
    spendingLimit: '',
    allowedActions: [] as string[],
  };

  const renderStep = (formProps: any) => {
    switch (currentStep) {
      case 1:
        return (
          <SessionKeyStep1 
            {...formProps} 
            onNext={() => setStep(2)} 
          />
        );
      case 2:
        return (
          <SessionKeyStep2
            {...formProps}
            onNext={() => setStep(3)}
          />
        );
      case 3:
        return (
          <SessionKeyStep3
            values={formProps.values}
            onSubmit={formProps.handleSubmit}
          />
        );
      case 4:
        return (
          <SessionKeySuccess
            name={formProps.values.name}
            duration={formProps.values.duration}
            onClose={() => onComplete(formProps.values)}
            onRetry={() => setStep(3)}
          />
        );
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={() => setStep(4)}
    >
      {(formProps) => renderStep(formProps)}
    </Formik>
  );
};

export default SessionKeyForm;
