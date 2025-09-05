// src/components/DeleteConfirmationModal.jsx
export default function DeleteConfirmationModal({ item, onConfirm, onCancel }) {
    if (!item) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="card shadow-elev-3 w-full max-w-sm m-4">
                <div className="card-body p-6 text-center">
                    <h2 className="text-base font-semibold text-slate-900">
                        Confirmar eliminación
                    </h2>
                    <p className="helper mt-2">
                        ¿Estás seguro de que deseas eliminar este registro?
                    </p>

                    <div className="flex justify-center gap-3 mt-6">
                        <button onClick={onCancel} className="btn btn-ghost">
                            Cancelar
                        </button>
                        <button onClick={onConfirm} className="btn btn-danger">
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
