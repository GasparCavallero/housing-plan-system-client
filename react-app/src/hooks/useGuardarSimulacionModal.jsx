import { useState } from "react";
import GuardarSimulacionModal from "../components/SaveSimulationModal";

export function useGuardarSimulacionModal() {
  const [state, setState] = useState({
    open: false,
    resolve: null,
  });

  const pedirDatos = () => {
    return new Promise((resolve) => {
      setState({
        open: true,
        resolve,
      });
    });
  };

  const handleClose = () => {
    state.resolve(null); // cancelado
    setState((s) => ({ ...s, open: false }));
  };

  const handleSubmit = (data) => {
    state.resolve(data); // { titulo, descripcion }
    setState((s) => ({ ...s, open: false }));
  };

  const modal = (
    <GuardarSimulacionModal
      open={state.open}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  );

  return { pedirDatos, modal };
}