'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LogOut, Image as ImageIcon, PlusCircle, ShoppingBag, ArrowLeft, Users, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [editForm, setEditForm] = useState({ name: '', description: '', price: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [newImageBase64, setNewImageBase64] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState('women');
  
  // States for admins
  const [adminEmails, setAdminEmails] = useState<{id: string, email: string}[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  const router = useRouter();

  // Controlar tema de colores según el desplegable
  useEffect(() => {
    if (selectedCategory === 'men') {
      document.body.classList.add('theme-men');
    } else {
      document.body.classList.remove('theme-men');
    }
    return () => {
      document.body.classList.remove('theme-men'); 
    };
  }, [selectedCategory]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const email = session?.user?.email;
      if (!email) {
        setIsAdmin(false);
        router.push('/');
        return;
      }
      setCurrentUserEmail(email);
      if (email === 'andrecn643@gmail.com') {
        setIsAdmin(true);
        fetchAdmins();
        return;
      }
      // Check securely against database
      try {
        const { data } = await supabase.from('admins').select('email').eq('email', email);
        if (data && data.length > 0) {
          setIsAdmin(true);
          fetchAdmins();
        } else {
          setIsAdmin(false);
          router.push('/');
        }
      } catch (e) {
        setIsAdmin(false);
        router.push('/');
      }
    });
  }, [router]);

  const fetchAdmins = async () => {
    try {
      const { data } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
      if (data) setAdminEmails(data);
    } catch(e) {}
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
       alert('Escribe un correo electrónico válido.');
       return;
    }
    setIsAddingAdmin(true);
    try {
       const { error } = await supabase.from('admins').insert([{ email: newAdminEmail.trim() }]);
       if (error) {
          alert('Hubo un error o el correo ya estaba registrado: ' + error.message);
       } else {
          alert('Nuevo administrador configurado con éxito.');
          setNewAdminEmail('');
          fetchAdmins();
       }
    } catch(e) {}
    setIsAddingAdmin(false);
  };

  const handleRemoveAdmin = async (id: string, adminEmail: string) => {
     if (!confirm(`¿Estás seguro de quitarle el acceso de administrador a ${adminEmail}?`)) return;
     try {
       const { error } = await supabase.from('admins').delete().eq('id', id);
       if (error) alert('Error al revocar acceso: ' + error.message);
       else fetchAdmins();
     } catch (e) {}
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es demasiado pesada (máximo 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImageBase64(reader.result as string);
        alert("¡Recibido! Imagen de producto lista y guardada en memoria. Ahora da clic en Guardar y Publicar.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCreateProduct = async () => {
    setIsSaving(true);
    const name = (document.getElementById('new-prod-name') as HTMLInputElement).value;
    const description = (document.getElementById('new-prod-desc') as HTMLTextAreaElement).value;
    const price = parseFloat((document.getElementById('new-prod-price') as HTMLInputElement).value) || 0;
    const category = selectedCategory;
    
    // Inyectando imagen Real Base 64
    const image = newImageBase64 || '/Productos/2.jpeg'; // Faux image as fallback

    const { error } = await supabase.from('products').insert([{ name, description, price, image, category }]);
    setIsSaving(false);
    
    if (!error) {
      alert("¡Producto nuevo agregado a la tienda con éxito!");
      (document.getElementById('new-prod-name') as HTMLInputElement).value = '';
      (document.getElementById('new-prod-desc') as HTMLTextAreaElement).value = '';
      (document.getElementById('new-prod-price') as HTMLInputElement).value = '';
      setNewImageBase64('');
    } else {
      alert("Hubo un error al guardar: " + error.message);
    }
  };

  if (isAdmin === null) return <div className="admin-loading">Verificando seguridad...</div>;
  if (isAdmin === false) return null;

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <Link href="/" className="btn" style={{border: '1px solid var(--border-light)'}}>
          <ArrowLeft size={18}/> Volver
        </Link>
        <h1 className="admin-title">Panel de Control Farmasi ✨</h1>
        <button onClick={handleLogout} className="btn"><LogOut size={18}/></button>
      </header>

      <main className="admin-content">
        <section className="admin-section">
          <h2><ImageIcon size={28} color="var(--primary-accent)"/> Gestión de Evidencias</h2>
          <p className="admin-subtitle">Mantén el catálogo de confianza fresco. Sube nuevas fotos de tus clientes felices para inyectarlas directamente al carrusel animado de la página principal.</p>
          
          <div className="admin-upload-box">
             <input type="file" id="evidence-upload" hidden />
             <label htmlFor="evidence-upload" className="btn btn-primary" style={{display:'inline-flex', cursor:'pointer', margin: '0 auto'}}>
               <PlusCircle size={18}/> Seleccionar Fotografías Completas
             </label>
             <p style={{marginTop: '1rem', color:'var(--text-light)', fontSize: '0.85rem'}}>*Soporta .jpg, .png y .jpeg (Máx 5MB)</p>
          </div>
        </section>

        <section className="admin-section">
          <h2><ShoppingBag size={28} color="var(--primary-accent)"/> Alta de Nuevos Productos</h2>
          <p className="admin-subtitle">Da de alta de manera ilimitada cualquier producto nuevo que recibas. Aparecerá inmediatamente acomodado en las rejillas de venta para tus clientes.</p>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            <label style={{fontSize:'0.85rem', color:'gray', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '1rem'}}>Nombre del Producto</label>
            <input type="text" id="new-prod-name" className="input-field" placeholder="Ej: Máscara Zen Extending" />
            
            <label style={{fontSize:'0.85rem', color:'gray', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Descripción Estelar</label>
            <textarea id="new-prod-desc" className="input-field" placeholder="Describe vívidamente todos los beneficios para enamorar al cliente..." rows={4}></textarea>
            
            <label style={{fontSize:'0.85rem', color:'gray', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Precio de Venta (MXN)</label>
            <input type="number" id="new-prod-price" className="input-field" placeholder="0.00" />
            
            <label style={{fontSize:'0.85rem', color:'gray', textTransform: 'uppercase', letterSpacing: '0.1em'}}>¿Es para Mujer o para Hombre?</label>
            <select id="new-prod-category" className="input-field" style={{cursor: 'pointer'}} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option value="women">Sección Mujeres (Línea de Maquillaje / Cuidado)</option>
              <option value="men">Sección Hombres (Línea Masculina)</option>
            </select>
            
            <label style={{fontSize:'0.85rem', color:'gray', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Imagen de Exhibición</label>
            <div className="admin-upload-box" style={{padding: '2rem 1rem', marginBottom: '2rem'}}>
               <input type="file" id="product-upload" accept="image/*" onChange={handleImageSelect} hidden />
               <label htmlFor="product-upload" className="btn" style={{border: '1px solid var(--primary-accent)', color:'var(--text-dark)', display:'inline-flex', cursor:'pointer', margin: '0 auto'}}>
                 <ImageIcon size={18}/> {newImageBase64 ? '¡Foto Cargada Exitosamente! (Cambiar)' : 'Buscar Foto del Producto'}
               </label>
            </div>

            <button className="btn btn-primary" style={{padding: '1rem', justifyContent:'center', fontSize: '1rem'}} onClick={handleCreateProduct} disabled={isSaving}>
              <PlusCircle size={20}/> {isSaving ? 'Registrando en la Nube...' : 'Guardar y Publicar Producto Nuevo'}
            </button>
          </div>
        </section>

        {currentUserEmail === 'andrecn643@gmail.com' && (
          <section className="admin-section" style={{marginBottom: '5rem'}}>
            <h2><Users size={28} color="var(--primary-accent)"/> Gestión de Administradores (Staff)</h2>
            <p className="admin-subtitle">Añade el correo de socios o empleados. Una vez añadidos, si inician sesión con Google y ese correo, recibirán permisos de administrador automáticamente.</p>
            
            <div style={{display: 'flex', gap: '1rem', marginTop: '2rem', marginBottom: '1.5rem', flexWrap:'wrap'}}>
               <input type="email" className="input-field" style={{margin: 0, flex: 1, minWidth: '250px'}} placeholder="Correo de Google (ej: socio@gmail.com)" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} />
               <button className="btn btn-primary" style={{display:'flex', gap:'0.5rem', alignItems:'center', justifyContent: 'center'}} onClick={handleAddAdmin} disabled={isAddingAdmin}>
                  <PlusCircle size={18}/> {isAddingAdmin ? 'Registrando...' : 'Añadir Acceso'}
               </button>
            </div>

            <div style={{background: 'rgba(255,255,255,0.4)', borderRadius:'12px', overflow:'hidden'}}>
               {adminEmails.map((adm) => (
                  <div key={adm.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding: '1rem 1.5rem', borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                     <span style={{fontFamily: 'Montserrat', fontWeight: 500, color: 'var(--text-dark)'}}>{adm.email}</span>
                     <button onClick={() => handleRemoveAdmin(adm.id, adm.email)} style={{background:'transparent', border:'none', color:'red', cursor:'pointer', padding:'0.5rem', opacity:0.6}} title="Revocar Accesos" onMouseOver={e=>e.currentTarget.style.opacity='1'} onMouseOut={e=>e.currentTarget.style.opacity='0.6'}>
                        <Trash2 size={18} />
                     </button>
                  </div>
               ))}
               {adminEmails.length === 0 && (
                  <div style={{padding: '2rem', textAlign:'center', color:'var(--text-light)', fontSize:'0.9rem', fontStyle:'italic'}}>
                    Todavía no hay administradores adicionales configurados. ¡Agrega uno arriba!
                  </div>
               )}
            </div>
            <p style={{fontSize: '0.8rem', color: 'gray', marginTop:'1rem'}}>*Tu correo principal siempre tendrá acceso nivel maestro invulnerable.</p>
          </section>
        )}
      </main>
    </div>
  );
}
