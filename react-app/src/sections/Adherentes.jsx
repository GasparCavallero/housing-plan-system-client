import { useEffect, useState } from "react";
import { listarAdherentes } from "../services/services.js";

function Adherentes() {
  const [data, setData] = useState([]);

  useEffect(() => {
    listarAdherentes().then(setData);
  }, []);

  return (
    <section id="adherentes" className="panel">
      <h2>Adherentes</h2>

      <table>
        <tbody>
          {data.map(a => (
            <tr key={a.id}>
              <td>{a.nombre}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default Adherentes;