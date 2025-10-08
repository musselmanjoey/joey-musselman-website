export default function Footer() {
  return (
    <footer className="site-footer py-8 text-center border-t border-gray-200 bg-white">
      <div className="site-info text-sm text-gray-600">
        <p>© {new Date().getFullYear()} The Famous Joey Musselman</p>
      </div>
    </footer>
  );
}
